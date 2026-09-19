import logging
import os
import threading
import time
from datetime import date

from fastapi import FastAPI, Header, HTTPException
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from schemas import (
    AlertExplanation,
    AlertRequest,
    ChatRequest,
    ChatResponse,
    InvestmentTipsResponse,
    RegimeReport,
    RegimeRequest,
    TipsRequest,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("macroni.proxy")

APP_SHARED_TOKEN = os.environ["APP_SHARED_TOKEN"]
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")

# Soft, in-memory daily cap - resets on cold start/redeploy, so this is a secondary
# safety net, not the authoritative one. Set a real budget alert / quota on the
# Gemini API key in Google Cloud Console as the hard backstop.
MAX_REQUESTS_PER_DAY = 300
MAX_MODEL_ATTEMPTS = 3

_client = genai.Client(api_key=GEMINI_API_KEY)
_lock = threading.Lock()
_usage = {"date": date.today().isoformat(), "count": 0}

REGIME_SYSTEM_PROMPT = """You are a macro research analyst assisting a portfolio manager (PM). \
You are given a snapshot of quantitative macro/market signals, recent central-bank and financial \
news excerpts, and the PM's current portfolio exposures.

Rules:
- Reason ONLY from the data provided. Never invent data points, statistics, or events that are \
not present in the input.
- If signals disagree with each other, say so explicitly rather than forcing a false consensus.
- Write the narrative in plain English suitable for a PM skimming a dashboard between meetings - \
avoid unexplained jargon.
- This is a research/monitoring aid, NOT a trade recommendation. Do not tell the PM to buy or \
sell anything. Frame risk flags as things to watch, not instructions.
- If the portfolio section is empty, leave portfolio_commentary as an empty string.
"""

ALERT_SYSTEM_PROMPT = """You are a macro research analyst assisting a portfolio manager. \
An automated rule has just fired on one signal. Given the signal's current value/z-score and \
recent related news (if any), write a short, plain-English explanation of why this likely \
matters and what related developments the PM might want to watch next. Do not recommend trades. \
Reason only from the data given."""

TIPS_SYSTEM_PROMPT = """You are a financial educator reviewing a portfolio's composition and the \
current macro backdrop, both given to you as data.

Rules:
- Reason ONLY from the data provided. Never invent holdings, numbers, or events not present in \
the input.
- Produce general, educational observations about portfolio construction - concentration risk, \
diversification gaps, duration/rate exposure, sector tilts - not personalized financial advice.
- NEVER recommend buying or selling a specific security. Frame every tip as "worth considering" \
or "worth reviewing," never as an instruction.
- If the portfolio is empty or has too little data to say anything meaningful, return an empty \
tips list rather than inventing generic filler.
- Return at most 5 tips, ordered by how much they matter."""

CHAT_SYSTEM_PROMPT = """You are a macro research analyst assisting a portfolio manager in a chat \
conversation. You are given the current macro/market signals, recent news excerpts, the PM's \
portfolio, and the conversation so far.

Rules:
- Answer ONLY from the data provided. Never invent data points, holdings, or events not present \
in the input. If you don't have enough information to answer, say so plainly.
- You may be asked hypothetical "what if" questions (e.g. "what if rates rise 1%"). Reason \
through these qualitatively using the given signals and general macro relationships - never claim \
to have run a precise numeric simulation you cannot actually perform.
- This is a research/monitoring aid, NOT financial advice. Do not tell the PM to buy or sell \
anything - if the question invites a trade recommendation, redirect to the relevant facts/risks \
instead and note that the decision is theirs.
- Keep answers conversational and concise - a few sentences to a short paragraph, not a full report.
- Politely decline questions unrelated to the portfolio/markets/macro topic."""

app = FastAPI(title="MACRONI AI Proxy")


def _check_auth(x_app_token: str | None) -> None:
    if x_app_token != APP_SHARED_TOKEN:
        raise HTTPException(status_code=401, detail="invalid or missing app token")


def _check_rate_limit() -> None:
    today = date.today().isoformat()
    with _lock:
        if _usage["date"] != today:
            _usage["date"] = today
            _usage["count"] = 0
        if _usage["count"] >= MAX_REQUESTS_PER_DAY:
            raise HTTPException(status_code=429, detail="daily request cap reached, try again tomorrow")
        _usage["count"] += 1


def _generate(system_prompt: str, user_prompt: str, schema: type):
    """Call Gemini with retry on transient (5xx) errors. Gemini's API intermittently
    returns 503 'high demand' errors that clear up within a few seconds - worth
    retrying a couple of times before giving up and telling the client to try later.
    """
    last_exc: Exception | None = None
    for attempt in range(MAX_MODEL_ATTEMPTS):
        try:
            response = _client.models.generate_content(
                model=GEMINI_MODEL,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
            )
            if response.parsed is None:
                logger.error("Gemini returned non-conforming response: %r", response.text)
                raise HTTPException(status_code=502, detail="model did not return a valid response")
            return response.parsed
        except genai_errors.ServerError as exc:
            last_exc = exc
            logger.warning("Gemini server error on attempt %d/%d: %s", attempt + 1, MAX_MODEL_ATTEMPTS, exc)
            if attempt < MAX_MODEL_ATTEMPTS - 1:
                time.sleep(2 * (attempt + 1))
        except genai_errors.ClientError as exc:
            logger.error("Gemini client error: %s", exc)
            raise HTTPException(status_code=502, detail=f"AI model rejected the request: {exc}") from exc

    raise HTTPException(
        status_code=502,
        detail="The AI model is temporarily overloaded after several retries - please try again shortly.",
    ) from last_exc


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/v1/regime", response_model=RegimeReport)
def generate_regime(payload: RegimeRequest, x_app_token: str | None = Header(default=None)):
    _check_auth(x_app_token)
    _check_rate_limit()

    user_prompt = (
        f"## Current Signal Snapshot\n{payload.signal_table_md}\n\n"
        f"## Recent Central Bank / News Excerpts\n{payload.news_excerpts_md}\n\n"
        f"## Current Portfolio Exposures\n{payload.portfolio_summary_md}\n\n"
        "Produce a regime assessment."
    )
    return _generate(REGIME_SYSTEM_PROMPT, user_prompt, RegimeReport)


@app.post("/v1/alert-explanation", response_model=AlertExplanation)
def generate_alert(payload: AlertRequest, x_app_token: str | None = Header(default=None)):
    _check_auth(x_app_token)
    _check_rate_limit()

    user_prompt = (
        f"Alert rule '{payload.rule_id}' fired on signal '{payload.signal_name}' "
        f"(current value: {payload.value:.4f}, severity: {payload.severity}).\n\n"
        f"## Recent Related News\n{payload.news_excerpts_md}\n\n"
        "Explain this alert."
    )
    return _generate(ALERT_SYSTEM_PROMPT, user_prompt, AlertExplanation)


@app.post("/v1/investment-tips", response_model=InvestmentTipsResponse)
def generate_tips(payload: TipsRequest, x_app_token: str | None = Header(default=None)):
    _check_auth(x_app_token)
    _check_rate_limit()

    user_prompt = (
        f"## Current Signal Snapshot\n{payload.signal_table_md}\n\n"
        f"## Current Portfolio Exposures\n{payload.portfolio_summary_md}\n\n"
        "Produce portfolio health tips."
    )
    return _generate(TIPS_SYSTEM_PROMPT, user_prompt, InvestmentTipsResponse)


@app.post("/v1/chat", response_model=ChatResponse)
def generate_chat(payload: ChatRequest, x_app_token: str | None = Header(default=None)):
    _check_auth(x_app_token)
    _check_rate_limit()

    history_text = "\n".join(f"{m.role.upper()}: {m.content}" for m in payload.history)
    user_prompt = (
        f"## Current Signal Snapshot\n{payload.signal_table_md}\n\n"
        f"## Recent Central Bank / News Excerpts\n{payload.news_excerpts_md}\n\n"
        f"## Current Portfolio Exposures\n{payload.portfolio_summary_md}\n\n"
        f"## Conversation so far\n{history_text or '(no previous messages)'}\n\n"
        f"## New question\n{payload.question}"
    )
    return _generate(CHAT_SYSTEM_PROMPT, user_prompt, ChatResponse)

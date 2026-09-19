import logging

import requests
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.interpreter import generate_chat_response
from app.ai.schemas import ChatMessage
from app.db import get_db
from app.models.news import NewsItem
from app.portfolio.exposures import compute_portfolio_exposures, format_exposure_summary_md
from app.signals.engine import latest_snapshot

logger = logging.getLogger("app.api.chat")

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatIn(BaseModel):
    question: str
    history: list[ChatMessage] = []


class ChatOut(BaseModel):
    answer: str


@router.post("", response_model=ChatOut)
def post_chat(payload: ChatIn, db: Session = Depends(get_db)):
    signals = latest_snapshot(db)
    news_items = db.query(NewsItem).order_by(NewsItem.published_at.desc()).limit(10).all()
    exposure = compute_portfolio_exposures(db)
    portfolio_summary_md = format_exposure_summary_md(exposure)

    try:
        answer = generate_chat_response(
            payload.question, payload.history, signals, news_items, portfolio_summary_md
        )
        return ChatOut(answer=answer)
    except requests.HTTPError as exc:
        logger.exception("chat request failed (proxy returned an error)")
        try:
            detail = exc.response.json().get("detail", exc.response.text)
        except Exception:
            detail = str(exc)
        if exc.response is not None and exc.response.status_code == 429:
            detail = "Daily AI usage cap reached - try again tomorrow."
        return ChatOut(answer=f"Sorry, I couldn't answer that just now: {detail}")
    except requests.RequestException as exc:
        logger.exception("chat request failed (could not reach AI proxy)")
        return ChatOut(answer=f"Sorry, I couldn't reach the AI service: {exc}")

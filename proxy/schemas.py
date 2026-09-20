from typing import Literal

from pydantic import BaseModel, Field


class RiskFlag(BaseModel):
    signal: str = Field(description="The signal name this flag relates to, e.g. 'yield_curve_slope'")
    severity: Literal["low", "medium", "high"]
    explanation: str = Field(description="One or two plain-English sentences explaining the risk")


class RegimeReport(BaseModel):
    regime_label: str = Field(
        description="Short regime label, e.g. 'Late-cycle, disinflationary, policy-neutral'"
    )
    narrative: str = Field(description="2-4 paragraph plain-English macro narrative for a PM")
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    portfolio_commentary: str = Field(
        default="", description="Commentary on how the current regime interacts with the given portfolio"
    )


class AlertExplanation(BaseModel):
    explanation: str = Field(description="One or two plain-English sentences explaining why this alert fired")
    suggested_watch_items: list[str] = Field(default_factory=list)


class RegimeRequest(BaseModel):
    signal_table_md: str
    news_excerpts_md: str
    portfolio_summary_md: str = "No portfolio configured."


class AlertRequest(BaseModel):
    rule_id: str
    signal_name: str
    value: float
    severity: str
    news_excerpts_md: str = "No recent news available."


class InvestmentTip(BaseModel):
    title: str = Field(description="Short tip headline, e.g. 'Concentrated in one sector'")
    tip: str = Field(description="1-3 sentences explaining the observation and what to consider")
    category: Literal["diversification", "risk", "cost", "other"]
    severity: Literal["low", "medium", "high"]


class InvestmentTipsResponse(BaseModel):
    tips: list[InvestmentTip] = Field(default_factory=list)


class TipsRequest(BaseModel):
    signal_table_md: str
    portfolio_summary_md: str = "No portfolio configured."


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    signal_table_md: str
    news_excerpts_md: str
    portfolio_summary_md: str = "No portfolio configured."
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str


class TradeCall(BaseModel):
    ticker: str = Field(description="Equity ticker exactly as given in the technical signals input")
    call: Literal["strong_buy", "buy", "hold", "sell", "strong_sell"]
    confidence: Literal["low", "medium", "high"] = Field(
        description="How much the technical and macro signals agree for this ticker - disagreement means lower confidence"
    )
    rationale: str = Field(description="2-4 sentences citing the specific technical/macro numbers used")


class TradeGuidanceResponse(BaseModel):
    calls: list[TradeCall] = Field(default_factory=list)
    overall_note: str = Field(default="", description="1-2 sentence portfolio-level takeaway, if any")


class TradeGuidanceRequest(BaseModel):
    signal_table_md: str
    technical_signals_md: str
    portfolio_summary_md: str = "No portfolio configured."


class SupportRequest(BaseModel):
    sender_email: str
    message: str

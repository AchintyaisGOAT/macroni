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


class InvestmentTip(BaseModel):
    title: str
    tip: str
    category: Literal["diversification", "risk", "cost", "other"]
    severity: Literal["low", "medium", "high"]


class InvestmentTipsResponse(BaseModel):
    tips: list[InvestmentTip] = Field(default_factory=list)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class TradeCall(BaseModel):
    ticker: str
    call: Literal["strong_buy", "buy", "hold", "sell", "strong_sell"]
    confidence: Literal["low", "medium", "high"]
    rationale: str


class TradeGuidanceResponse(BaseModel):
    calls: list[TradeCall] = Field(default_factory=list)
    overall_note: str = ""

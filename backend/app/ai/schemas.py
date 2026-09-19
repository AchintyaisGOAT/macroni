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

from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class RegimeReportRecord(Base):
    __tablename__ = "regime_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    regime_label: Mapped[str] = mapped_column(String(120))
    narrative: Mapped[str] = mapped_column(Text)
    risk_flags_json: Mapped[str] = mapped_column(Text, default="[]")
    portfolio_commentary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

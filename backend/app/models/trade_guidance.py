from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TradeGuidanceRecord(Base):
    __tablename__ = "trade_guidance"

    id: Mapped[int] = mapped_column(primary_key=True)
    # "portfolio" (your real broker-synced holdings) or "watchlist" (stocks you're
    # just tracking) - same AI pipeline, kept as separate result sets per scope.
    scope: Mapped[str] = mapped_column(String(20), default="portfolio", index=True)
    calls_json: Mapped[str] = mapped_column(Text, default="[]")
    overall_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

from datetime import datetime, timezone

from sqlalchemy import DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class InvestmentTipsRecord(Base):
    __tablename__ = "investment_tips"

    id: Mapped[int] = mapped_column(primary_key=True)
    tips_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

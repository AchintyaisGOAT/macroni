from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SignalSnapshot(Base):
    __tablename__ = "signal_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), index=True)
    value: Mapped[float] = mapped_column(Float)
    zscore: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentile: Mapped[float | None] = mapped_column(Float, nullable=True)
    label: Mapped[str] = mapped_column(String(50), default="")
    computed_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )

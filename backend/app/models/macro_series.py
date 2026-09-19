from datetime import date as date_type, datetime, timezone

from sqlalchemy import Date, DateTime, Float, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class FredObservation(Base):
    __tablename__ = "fred_observations"
    __table_args__ = (
        UniqueConstraint("series_id", "date", name="uq_fred_series_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[str] = mapped_column(String(20), index=True)
    date: Mapped[date_type] = mapped_column(Date, index=True)
    value: Mapped[float] = mapped_column(Float)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

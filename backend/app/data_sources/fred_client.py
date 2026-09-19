import logging

from fredapi import Fred
from sqlalchemy.orm import Session

from app.config import settings
from app.data_sources.base import retry, upsert_rows
from app.models.macro_series import FredObservation

logger = logging.getLogger("app.data_sources.fred")

# 14 series for a growth / inflation / policy dashboard.
FRED_SERIES = [
    "CPIAUCSL",  # headline CPI
    "PCEPILFE",  # core PCE (Fed's preferred inflation gauge)
    "UNRATE",  # unemployment rate
    "PAYEMS",  # nonfarm payrolls
    "ICSA",  # initial jobless claims
    "GDP",  # nominal GDP
    "INDPRO",  # industrial production
    "FEDFUNDS",  # effective federal funds rate
    "DGS10",  # 10y treasury yield
    "DGS2",  # 2y treasury yield
    "T10Y2Y",  # 10y-2y spread
    "DTWEXBGS",  # broad USD index
    "UMCSENT",  # consumer sentiment
    "M2SL",  # M2 money supply
]

_client: Fred | None = None


def get_client() -> Fred:
    global _client
    if _client is None:
        if not settings.has_fred_key:
            raise RuntimeError("FRED_API_KEY is not configured")
        _client = Fred(api_key=settings.fred_api_key)
    return _client


def refresh_series(db: Session, series_id: str) -> int:
    client = get_client()
    series = retry(lambda: client.get_series(series_id), attempts=3, base_delay=2.0)
    rows = [
        {"series_id": series_id, "date": idx.date(), "value": float(val)}
        for idx, val in series.items()
        if val is not None and val == val  # filter NaN
    ]
    return upsert_rows(
        db,
        FredObservation,
        rows,
        conflict_columns=["series_id", "date"],
        update_columns=["value", "fetched_at"],
    )


def refresh_all_series(db: Session, series_ids: list[str] | None = None) -> dict[str, int]:
    results: dict[str, int] = {}
    for series_id in series_ids or FRED_SERIES:
        try:
            results[series_id] = refresh_series(db, series_id)
        except Exception:
            logger.exception("failed to refresh FRED series %s", series_id)
            results[series_id] = -1
    return results

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import GITHUB_REPO, get_app_version, settings
from app.db import get_db
from app.models.regime import RegimeReportRecord
from app.models.signals import SignalSnapshot
from app.scheduler import get_last_regime_status, get_last_tips_status, manual_refresh, refresh_regime_report
from app.signals.engine import latest_snapshot

router = APIRouter(prefix="/api", tags=["dashboard"])


class SignalOut(BaseModel):
    name: str
    value: float
    zscore: float | None
    percentile: float | None
    label: str
    computed_at: str


class RegimeReportOut(BaseModel):
    regime_label: str
    narrative: str
    risk_flags: list[dict]
    portfolio_commentary: str
    created_at: str


@router.get("/signals", response_model=list[SignalOut])
def get_signals(db: Session = Depends(get_db)):
    rows = latest_snapshot(db)
    return [
        SignalOut(
            name=r.name,
            value=r.value,
            zscore=r.zscore,
            percentile=r.percentile,
            label=r.label,
            computed_at=r.computed_at.isoformat(),
        )
        for r in sorted(rows, key=lambda x: x.name)
    ]


@router.get("/signals/{name}/history", response_model=list[SignalOut])
def get_signal_history(name: str, db: Session = Depends(get_db), limit: int = 60):
    rows = (
        db.query(SignalSnapshot)
        .filter(SignalSnapshot.name == name)
        .order_by(SignalSnapshot.computed_at.desc())
        .limit(limit)
        .all()
    )
    rows.reverse()
    return [
        SignalOut(
            name=r.name,
            value=r.value,
            zscore=r.zscore,
            percentile=r.percentile,
            label=r.label,
            computed_at=r.computed_at.isoformat(),
        )
        for r in rows
    ]


@router.get("/regime", response_model=RegimeReportOut | None)
def get_regime(db: Session = Depends(get_db)):
    row = db.query(RegimeReportRecord).order_by(RegimeReportRecord.created_at.desc()).first()
    if not row:
        return None
    return RegimeReportOut(
        regime_label=row.regime_label,
        narrative=row.narrative,
        risk_flags=json.loads(row.risk_flags_json),
        portfolio_commentary=row.portfolio_commentary,
        created_at=row.created_at.isoformat(),
    )


@router.post("/regime/refresh")
def post_regime_refresh():
    return refresh_regime_report()


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    signals = latest_snapshot(db)
    last_updated = max((s.computed_at for s in signals), default=None)
    return {
        "fred_configured": settings.has_fred_key,
        "ai_configured": True,  # AI runs through the hosted proxy - no local key needed
        "last_regime_status": get_last_regime_status(),
        "last_tips_status": get_last_tips_status(),
        "last_updated": last_updated.isoformat() if last_updated else None,
        "app_version": get_app_version(),
        "github_repo": GITHUB_REPO,
    }


@router.post("/refresh")
def post_refresh():
    return manual_refresh()

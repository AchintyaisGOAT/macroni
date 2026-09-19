from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.alerts.rule_engine import load_rules
from app.db import get_db
from app.models.alerts import AlertEvent

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertOut(BaseModel):
    id: int
    rule_id: str
    severity: str
    signal_name: str
    value: float
    explanation: str
    active: bool
    created_at: str
    resolved_at: str | None


@router.get("", response_model=list[AlertOut])
def get_alerts(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(AlertEvent).order_by(AlertEvent.created_at.desc()).limit(limit).all()
    return [
        AlertOut(
            id=r.id,
            rule_id=r.rule_id,
            severity=r.severity,
            signal_name=r.signal_name,
            value=r.value,
            explanation=r.explanation,
            active=r.active,
            created_at=r.created_at.isoformat(),
            resolved_at=r.resolved_at.isoformat() if r.resolved_at else None,
        )
        for r in rows
    ]


@router.get("/rules")
def get_rules():
    return load_rules()

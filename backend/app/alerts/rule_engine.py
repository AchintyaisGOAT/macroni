import logging
import operator as op
from pathlib import Path

import yaml
from sqlalchemy.orm import Session

from app.models.alerts import AlertEvent
from app.models.signals import SignalSnapshot

logger = logging.getLogger("app.alerts.rule_engine")

RULES_PATH = Path(__file__).parent / "rules.yaml"

OPERATORS = {
    "<": op.lt,
    "<=": op.le,
    ">": op.gt,
    ">=": op.ge,
    "==": op.eq,
    "!=": op.ne,
}


def load_rules() -> list[dict]:
    with open(RULES_PATH, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("rules", [])


def _latest_signal(db: Session, name: str) -> SignalSnapshot | None:
    return (
        db.query(SignalSnapshot)
        .filter(SignalSnapshot.name == name)
        .order_by(SignalSnapshot.computed_at.desc())
        .first()
    )


def evaluate_rules(db: Session, rules: list[dict] | None = None) -> list[AlertEvent]:
    """Evaluate rules against the latest signal snapshot. Creates a new AlertEvent
    for each newly-firing rule (dedupes against an already-active event for that
    rule id) and auto-resolves active events whose rule no longer fires.
    """
    rules = rules if rules is not None else load_rules()
    newly_fired: list[AlertEvent] = []

    for rule in rules:
        rule_id = rule["id"]
        signal = _latest_signal(db, rule["signal"])
        active_event = (
            db.query(AlertEvent)
            .filter(AlertEvent.rule_id == rule_id, AlertEvent.active.is_(True))
            .first()
        )

        if signal is None:
            continue

        field_value = getattr(signal, rule.get("field", "value"), None)
        if field_value is None:
            continue

        comparator = OPERATORS[rule["operator"]]
        fires = comparator(field_value, rule["threshold"])

        if fires and active_event is None:
            event = AlertEvent(
                rule_id=rule_id,
                severity=rule.get("severity", "medium"),
                signal_name=rule["signal"],
                value=field_value,
                active=True,
            )
            db.add(event)
            newly_fired.append(event)
        elif not fires and active_event is not None:
            from datetime import datetime, timezone

            active_event.active = False
            active_event.resolved_at = datetime.now(timezone.utc)

    db.commit()
    for event in newly_fired:
        db.refresh(event)
    return newly_fired

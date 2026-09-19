from app.alerts.rule_engine import evaluate_rules
from app.models.alerts import AlertEvent
from app.models.signals import SignalSnapshot

RULES = [
    {"id": "test_rule", "signal": "yield_curve_slope", "field": "value", "operator": "<", "threshold": 0, "severity": "high"}
]


def _add_signal(db, name: str, value: float, zscore=None, percentile=None):
    db.add(SignalSnapshot(name=name, value=value, zscore=zscore, percentile=percentile, label=""))
    db.commit()


def test_rule_fires_when_condition_met(db):
    _add_signal(db, "yield_curve_slope", -0.3)
    fired = evaluate_rules(db, RULES)
    assert len(fired) == 1
    assert fired[0].rule_id == "test_rule"
    assert fired[0].active is True


def test_rule_does_not_refire_while_still_active(db):
    _add_signal(db, "yield_curve_slope", -0.3)
    evaluate_rules(db, RULES)
    _add_signal(db, "yield_curve_slope", -0.5)  # still fires, but already active
    fired_again = evaluate_rules(db, RULES)
    assert fired_again == []
    assert db.query(AlertEvent).filter(AlertEvent.active.is_(True)).count() == 1


def test_rule_resolves_when_condition_clears(db):
    _add_signal(db, "yield_curve_slope", -0.3)
    evaluate_rules(db, RULES)
    _add_signal(db, "yield_curve_slope", 0.4)  # curve un-inverts
    evaluate_rules(db, RULES)
    event = db.query(AlertEvent).filter(AlertEvent.rule_id == "test_rule").first()
    assert event.active is False
    assert event.resolved_at is not None


def test_rule_skipped_when_signal_missing(db):
    fired = evaluate_rules(db, RULES)
    assert fired == []

from dataclasses import dataclass


@dataclass
class SignalResult:
    name: str
    value: float
    zscore: float | None = None
    percentile: float | None = None
    label: str = ""

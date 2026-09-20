from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

UTC = ZoneInfo("UTC")


@dataclass
class ExchangeHours:
    code: str
    name: str
    region: str
    timezone: str
    open_time: time
    close_time: time


# Regular trading-session hours only - lunch breaks (TSE, HKEX, SSE all have one) and
# public holiday calendars are not modeled, so a market can show "open" on a local
# holiday. Good enough for "is it roughly trading hours right now", not a settlement system.
EXCHANGES: list[ExchangeHours] = [
    ExchangeHours("NSE", "National Stock Exchange", "India", "Asia/Kolkata", time(9, 15), time(15, 30)),
    ExchangeHours("NYSE", "New York Stock Exchange", "United States", "America/New_York", time(9, 30), time(16, 0)),
    ExchangeHours("TSE", "Tokyo Stock Exchange", "Japan", "Asia/Tokyo", time(9, 0), time(15, 0)),
    ExchangeHours("LSE", "London Stock Exchange", "United Kingdom", "Europe/London", time(8, 0), time(16, 30)),
    ExchangeHours("HKEX", "Hong Kong Stock Exchange", "Hong Kong", "Asia/Hong_Kong", time(9, 30), time(16, 0)),
    ExchangeHours("SSE", "Shanghai Stock Exchange", "China", "Asia/Shanghai", time(9, 30), time(15, 0)),
    ExchangeHours("ASX", "Australian Securities Exchange", "Australia", "Australia/Sydney", time(10, 0), time(16, 0)),
    ExchangeHours("FSE", "Frankfurt Stock Exchange (Xetra)", "Germany", "Europe/Berlin", time(9, 0), time(17, 30)),
]


def _is_trading_day(d: date) -> bool:
    return d.weekday() < 5


def _next_open(exch: ExchangeHours, tz: ZoneInfo, local_now: datetime) -> datetime:
    candidate_date = local_now.date()
    candidate_open = datetime.combine(candidate_date, exch.open_time, tzinfo=tz)
    if _is_trading_day(candidate_date) and local_now < candidate_open:
        return candidate_open
    candidate_date += timedelta(days=1)
    while not _is_trading_day(candidate_date):
        candidate_date += timedelta(days=1)
    return datetime.combine(candidate_date, exch.open_time, tzinfo=tz)


def get_exchange_status(exch: ExchangeHours, now_utc: datetime) -> dict:
    tz = ZoneInfo(exch.timezone)
    local_now = now_utc.astimezone(tz)
    today = local_now.date()
    today_open = datetime.combine(today, exch.open_time, tzinfo=tz)
    today_close = datetime.combine(today, exch.close_time, tzinfo=tz)

    is_open = _is_trading_day(today) and today_open <= local_now < today_close

    if is_open:
        next_change_at = today_close
        next_change_label = "closes"
    else:
        next_change_at = _next_open(exch, tz, local_now)
        next_change_label = "opens"

    return {
        "code": exch.code,
        "name": exch.name,
        "region": exch.region,
        "timezone": exch.timezone,
        "is_open": is_open,
        "local_time": local_now.isoformat(),
        "next_change_at": next_change_at.astimezone(UTC).isoformat(),
        "next_change_label": next_change_label,
    }


def get_all_exchange_statuses() -> list[dict]:
    now_utc = datetime.now(UTC)
    return [get_exchange_status(e, now_utc) for e in EXCHANGES]

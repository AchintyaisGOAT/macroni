import logging
import threading
import time

import pyotp
from SmartApi import SmartConnect
from SmartApi.smartExceptions import TokenException

from app.config import settings

logger = logging.getLogger("app.broker.angel_one")

_client: SmartConnect | None = None
_lock = threading.Lock()

# Angel One trading-symbol suffixes -> Yahoo Finance exchange suffixes, so broker
# holdings line up with the yfinance tickers the rest of the app already uses
# (price history, beta calc in app/portfolio/exposures.py, etc).
_EXCHANGE_SUFFIX = {"NSE": ".NS", "BSE": ".BO"}


class AngelNotConfigured(RuntimeError):
    pass


class AngelAuthError(RuntimeError):
    pass


def map_to_yahoo_ticker(tradingsymbol: str, exchange: str) -> str | None:
    """Convert e.g. ('RELIANCE-EQ', 'NSE') -> 'RELIANCE.NS'.

    Angel One appends a market-segment code after a dash - EQ (rolling
    settlement) is the common one, but stocks can also trade as -BE/-BZ
    (trade-to-trade/book-entry), -SM/-ST (SME), etc. Yahoo Finance has no
    concept of these segments and just wants the bare symbol, so we strip
    whatever segment code follows the last dash rather than only "-EQ".

    Returns None for exchanges/instrument types we don't have a Yahoo Finance
    mapping for (F&O, MCX commodities, currency derivatives, etc.) - callers
    should surface these as unmapped rather than guessing.
    """
    suffix = _EXCHANGE_SUFFIX.get((exchange or "").upper())
    if suffix is None:
        return None
    symbol = (tradingsymbol or "").strip()
    if "-" in symbol:
        symbol = symbol.rsplit("-", 1)[0]
    if not symbol:
        return None
    return f"{symbol}{suffix}"


def _login() -> SmartConnect:
    client = SmartConnect(api_key=settings.angel_api_key)
    totp_code = pyotp.TOTP(settings.angel_totp_secret).now()
    result = client.generateSession(settings.angel_client_code, settings.angel_mpin, totp_code)
    if not result.get("status"):
        raise AngelAuthError(result.get("message") or "Angel One login failed")
    return client


def is_connected() -> bool:
    """Whether a login has already succeeded this run - does NOT trigger one.

    Used by the status endpoint so polling it never itself causes login attempts
    against Angel One's servers.
    """
    return _client is not None


def get_client(force_relogin: bool = False) -> SmartConnect:
    global _client, _holdings_cache
    if not settings.has_angel_credentials:
        raise AngelNotConfigured("Angel One credentials are not configured")
    with _lock:
        if _client is None or force_relogin:
            _client = _login()
            _holdings_cache = None  # a fresh/re-login may mean different credentials
    return _client


def _call(method_name: str, *args, **kwargs):
    """Call a read-only SmartConnect method, retrying once after a fresh login
    if the session has expired (Angel One sessions expire at midnight IST).
    """
    client = get_client()
    try:
        result = getattr(client, method_name)(*args, **kwargs)
    except TokenException:
        logger.info("Angel One session expired, re-logging in")
        client = get_client(force_relogin=True)
        result = getattr(client, method_name)(*args, **kwargs)

    if not result.get("status", True):
        raise AngelAuthError(result.get("message") or f"Angel One request '{method_name}' failed")
    return result.get("data")


# Angel One's holdings endpoint has a tight per-second rate limit and returns a
# non-JSON "Access denied because of exceeding access rate" body if hit too often -
# a short cache means flipping between the Broker/Portfolio tabs, or a sync right
# after the page loads, reuses the same data instead of risking that throttle.
_HOLDINGS_CACHE_TTL_SECONDS = 30.0
_holdings_cache: tuple[float, list[dict]] | None = None


def fetch_holdings(force_refresh: bool = False) -> list[dict]:
    global _holdings_cache
    now = time.monotonic()
    if not force_refresh and _holdings_cache is not None and (now - _holdings_cache[0]) < _HOLDINGS_CACHE_TTL_SECONDS:
        return _holdings_cache[1]
    data = _call("holding") or []
    _holdings_cache = (now, data)
    return data


def fetch_positions() -> list[dict]:
    return _call("position") or []


def fetch_funds() -> dict:
    data = _call("rmsLimit")
    return data if isinstance(data, dict) else {}


def disconnect() -> None:
    global _client, _holdings_cache
    with _lock:
        _holdings_cache = None
        if _client is not None:
            try:
                _client.terminateSession(settings.angel_client_code)
            except Exception:
                logger.exception("failed to cleanly terminate Angel One session")
            _client = None

"""Real-time price ticks from Angel One's own WebSocket feed (SmartWebSocketV2).

This is genuinely different from everything else in this app's price pipeline:
the daily-bar refresh (data_sources/market_yfinance.py) and the fast_info-based
live-quote polling (markets/live_quotes.py) both *pull* from Yahoo Finance on a
timer, so their freshness is capped by how often we ask. This instead opens a
persistent connection that the exchange *pushes* ticks through the instant a
trade happens - the closest thing to true real-time this app can offer, and
free, since it uses the same Angel One API access already required for the
Broker tab. It only covers whatever's currently held via Angel One (NSE/BSE
only) - there's no equivalent free broker-grade feed for international markets,
so Global Markets still relies on the polled Yahoo quotes.
"""

import logging
import threading

from SmartApi.smartWebSocketV2 import SmartWebSocketV2

from app.config import settings

logger = logging.getLogger("app.broker.live_feed")

_EXCHANGE_TYPE = {"NSE": 1, "BSE": 3}
_QUOTE_MODE = 2  # includes closed_price alongside last_traded_price, unlike LTP mode

_lock = threading.Lock()
_ws: SmartWebSocketV2 | None = None
_subscribed_tokens: set[str] = set()
# token -> {"price": last traded price, "change_pct": vs the feed's own prior close}
_ticks: dict[str, dict] = {}


def _on_data(wsapp, message: dict) -> None:
    token = message.get("token")
    ltp_raw = message.get("last_traded_price")
    close_raw = message.get("closed_price")
    if token is None or ltp_raw is None:
        return
    price = ltp_raw / 100.0
    change_pct = None
    if close_raw:
        change_pct = (ltp_raw - close_raw) / close_raw * 100
    with _lock:
        _ticks[token] = {"price": price, "change_pct": change_pct}


def _on_open(wsapp) -> None:
    logger.info("Angel One live feed connected")
    with _lock:
        by_exchange = _tokens_by_exchange(_subscribed_tokens)
    if by_exchange and _ws is not None:
        _ws.subscribe("macroni-live", _QUOTE_MODE, by_exchange)


def _on_error(wsapp, error) -> None:
    logger.warning("Angel One live feed error: %s", error)


def _on_close(wsapp) -> None:
    logger.info("Angel One live feed closed")


def _tokens_by_exchange(tokens: set[tuple[str, str]]) -> list[dict]:
    grouped: dict[int, list[str]] = {}
    for token, exchange in tokens:
        exchange_type = _EXCHANGE_TYPE.get(exchange.upper())
        if exchange_type is None:
            continue
        grouped.setdefault(exchange_type, []).append(token)
    return [{"exchangeType": ex_type, "tokens": tokens} for ex_type, tokens in grouped.items()]


def ensure_subscribed(tokens: list[tuple[str, str]], auth_token: str, feed_token: str) -> None:
    """tokens: list of (symboltoken, exchange), e.g. from angel_one.get_ticker_token_map()."""
    global _ws, _subscribed_tokens

    new_tokens = set(tokens)
    with _lock:
        added = new_tokens - _subscribed_tokens
        _subscribed_tokens = new_tokens
        needs_connect = _ws is None

    if needs_connect:
        with _lock:
            if _ws is None:
                ws = SmartWebSocketV2(
                    auth_token=auth_token,
                    api_key=settings.angel_api_key,
                    client_code=settings.angel_client_code,
                    feed_token=feed_token,
                )
                ws.on_open = _on_open
                ws.on_data = _on_data
                ws.on_error = _on_error
                ws.on_close = _on_close
                _ws = ws
        threading.Thread(target=_ws.connect, daemon=True).start()
        return  # _on_open will subscribe to everything in _subscribed_tokens once connected

    if added:
        try:
            _ws.subscribe("macroni-live", _QUOTE_MODE, _tokens_by_exchange(added))
        except Exception:
            logger.exception("failed to subscribe to new live-feed tokens")


def get_ticks() -> dict[str, dict]:
    with _lock:
        return dict(_ticks)


def is_running() -> bool:
    return _ws is not None

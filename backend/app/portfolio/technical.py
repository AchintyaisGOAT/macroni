import pandas as pd
from sqlalchemy.orm import Session

from app.models.portfolio import Holding
from app.portfolio.exposures import ensure_price_history
from app.signals.data_access import load_price_series, rolling_zscore

ZONES = ["strong_sell", "sell", "neutral", "buy", "strong_buy"]


def _rsi(prices: pd.Series, window: int = 14) -> pd.Series:
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / window, min_periods=window).mean()
    avg_loss = loss.ewm(alpha=1 / window, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    return 100 - (100 / (1 + rs))


def _zone_from_score(score: float) -> str:
    if score >= 60:
        return "strong_buy"
    if score >= 20:
        return "buy"
    if score <= -60:
        return "strong_sell"
    if score <= -20:
        return "sell"
    return "neutral"


def compute_technical_signal(prices: pd.Series) -> dict | None:
    """Purely quantitative per-ticker technical readout - no AI involved.

    Combines three well-known indicators, each independently normalized to
    -100..100 then averaged, so the mix stays interpretable and no single
    indicator can swing the score outside that range:
      - RSI(14) distance from its neutral midpoint (50)
      - 20-day price momentum z-score (how stretched vs its own recent history)
      - 50/200-day moving-average trend direction (falls back to price-vs-SMA50
        when there isn't yet 200 days of history)
    Returns None when there isn't enough price history (<60 sessions) to trust
    any of this.
    """
    clean = prices.dropna()
    if clean.shape[0] < 60:
        return None

    last_price = float(clean.iloc[-1])
    change_pct = float(clean.iloc[-1] / clean.iloc[-2] - 1) * 100 if clean.shape[0] > 1 else None
    components: list[float] = []

    rsi_val = None
    rsi_series = _rsi(clean).dropna()
    if not rsi_series.empty:
        rsi_val = float(rsi_series.iloc[-1])
        components.append((rsi_val - 50) / 50 * 100)

    momentum_zscore = None
    z_series = rolling_zscore(clean, window=20).dropna()
    if not z_series.empty:
        momentum_zscore = float(z_series.iloc[-1])
        components.append(max(-2.5, min(2.5, momentum_zscore)) / 2.5 * 100)

    sma50 = float(clean.rolling(50).mean().iloc[-1]) if clean.shape[0] >= 50 else None
    sma200 = float(clean.rolling(200).mean().iloc[-1]) if clean.shape[0] >= 200 else None
    if sma50 is not None and sma200 is not None:
        components.append(100.0 if sma50 > sma200 else -100.0)
    elif sma50 is not None:
        components.append(100.0 if last_price > sma50 else -100.0)

    if not components:
        return None

    score = max(-100.0, min(100.0, sum(components) / len(components)))
    return {
        "price": last_price,
        "change_pct": change_pct,
        "rsi": rsi_val,
        "sma50": sma50,
        "sma200": sma200,
        "momentum_zscore": momentum_zscore,
        "score": round(score, 1),
        "zone": _zone_from_score(score),
    }


def compute_technical_signals_for_tickers(db: Session, tickers: list[str]) -> list[dict]:
    results = []
    for ticker in tickers:
        ensure_price_history(db, ticker)
        signal = compute_technical_signal(load_price_series(db, ticker))
        if signal is None:
            continue
        results.append({"ticker": ticker, **signal})
    return results


def compute_portfolio_technical_signals(db: Session) -> list[dict]:
    holdings: list[Holding] = db.query(Holding).filter(Holding.asset_class == "equity").all()
    return compute_technical_signals_for_tickers(db, [h.ticker for h in holdings])


def format_technical_signals_md(signals: list[dict], empty_message: str = "No technical signals available.") -> str:
    if not signals:
        return empty_message
    lines = ["Per-holding technical readout (purely quantitative, not AI-generated):", ""]
    for s in signals:
        rsi_str = f"{s['rsi']:.0f}" if s["rsi"] is not None else "n/a"
        mom_str = f"{s['momentum_zscore']:+.2f}" if s["momentum_zscore"] is not None else "n/a"
        trend = "n/a"
        if s["sma50"] is not None and s["sma200"] is not None:
            trend = "uptrend (50d>200d avg)" if s["sma50"] > s["sma200"] else "downtrend (50d<200d avg)"
        change_str = f"{s['change_pct']:+.2f}%" if s.get("change_pct") is not None else "n/a"
        lines.append(
            f"- {s['ticker']}: price ${s['price']:.2f} ({change_str} vs prior close), RSI(14) {rsi_str}, "
            f"20d momentum z-score {mom_str}, {trend}, combined technical score {s['score']:+.0f}/100 "
            f"({s['zone'].replace('_', ' ')})"
        )
    return "\n".join(lines)

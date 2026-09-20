import logging

import numpy as np
import yfinance as yf
from sqlalchemy.orm import Session

from app.data_sources.market_yfinance import refresh_ticker
from app.models.portfolio import Holding
from app.signals.data_access import load_price_series

logger = logging.getLogger("app.portfolio.exposures")

# Published effective duration approximations for common bond ETFs (years).
# Not derivable from free price data alone; update periodically.
BOND_ETF_DURATION = {
    "TLT": 17.0,
    "IEF": 7.5,
    "SHY": 1.9,
    "HYG": 3.5,
    "LQD": 8.0,
    "AGG": 6.0,
    "BND": 6.2,
}


def ensure_price_history(db: Session, ticker: str) -> None:
    series = load_price_series(db, ticker)
    if series.empty:
        try:
            refresh_ticker(db, ticker)
        except Exception:
            logger.warning("could not fetch price history for portfolio ticker %s", ticker)


def _latest_price(db: Session, ticker: str) -> float | None:
    series = load_price_series(db, ticker)
    if series.dropna().empty:
        return None
    return float(series.dropna().iloc[-1])


def _ticker_beta_vs_spy(db: Session, ticker: str, spy_returns) -> float | None:
    prices = load_price_series(db, ticker).dropna()
    if prices.shape[0] < 60:
        return None
    returns = prices.pct_change().dropna()
    aligned = returns.align(spy_returns, join="inner")
    a, b = aligned
    if a.shape[0] < 60:
        return None
    a_tail, b_tail = a.tail(252), b.tail(252)
    if a_tail.std() == 0 or b_tail.std() == 0:
        return None
    beta = float(np.polyfit(b_tail.values, a_tail.values, 1)[0])
    return beta


def _sector_for_ticker(ticker: str) -> str | None:
    try:
        info = yf.Ticker(ticker).info
        sector = info.get("sector")
        return sector if sector else None
    except Exception:
        return None


def compute_portfolio_exposures(db: Session) -> dict:
    holdings: list[Holding] = db.query(Holding).all()
    if not holdings:
        return {
            "total_value": 0.0,
            "holdings": [],
            "by_asset_class": {},
            "by_region": {},
            "by_sector": {},
            "portfolio_beta": None,
            "portfolio_duration_years": None,
            "duration_coverage": 0.0,
        }

    for h in holdings:
        ensure_price_history(db, h.ticker)

    spy_returns = load_price_series(db, "SPY").dropna().pct_change().dropna()

    rows = []
    total_value = 0.0
    for h in holdings:
        price = _latest_price(db, h.ticker)
        value = (price * h.quantity) if price is not None else 0.0
        total_value += value
        rows.append({"holding": h, "price": price, "value": value})

    by_asset_class: dict[str, float] = {}
    by_region: dict[str, float] = {}
    by_sector: dict[str, float] = {}
    beta_weighted_sum = 0.0
    beta_weight_total = 0.0
    duration_weighted_sum = 0.0
    duration_weight_total = 0.0

    detail = []
    for row in rows:
        h, price, value = row["holding"], row["price"], row["value"]
        weight = (value / total_value) if total_value > 0 else 0.0
        by_asset_class[h.asset_class] = by_asset_class.get(h.asset_class, 0.0) + value
        by_region[h.region] = by_region.get(h.region, 0.0) + value

        beta = None
        if h.asset_class == "equity" and not spy_returns.empty:
            beta = _ticker_beta_vs_spy(db, h.ticker, spy_returns)
            if beta is not None:
                beta_weighted_sum += beta * value
                beta_weight_total += value

            sector = _sector_for_ticker(h.ticker)
            if sector:
                by_sector[sector] = by_sector.get(sector, 0.0) + value

        duration = BOND_ETF_DURATION.get(h.ticker)
        if h.asset_class == "bond" and duration is not None:
            duration_weighted_sum += duration * value
            duration_weight_total += value

        detail.append(
            {
                "ticker": h.ticker,
                "quantity": h.quantity,
                "asset_class": h.asset_class,
                "region": h.region,
                "price": price,
                "value": value,
                "weight": weight,
                "beta": beta,
            }
        )

    portfolio_beta = beta_weighted_sum / beta_weight_total if beta_weight_total > 0 else None
    portfolio_duration = duration_weighted_sum / duration_weight_total if duration_weight_total > 0 else None
    bond_value = by_asset_class.get("bond", 0.0)
    duration_coverage = (duration_weight_total / bond_value) if bond_value > 0 else 0.0

    return {
        "total_value": total_value,
        "holdings": detail,
        "by_asset_class": by_asset_class,
        "by_region": by_region,
        "by_sector": by_sector,
        "portfolio_beta": portfolio_beta,
        "portfolio_duration_years": portfolio_duration,
        "duration_coverage": duration_coverage,
    }


def format_exposure_summary_md(exposure: dict) -> str:
    if not exposure["holdings"]:
        return "No portfolio configured."

    lines = [f"Total portfolio value: ${exposure['total_value']:,.0f}", ""]
    if exposure["portfolio_beta"] is not None:
        lines.append(f"Portfolio equity beta (vs SPY): {exposure['portfolio_beta']:.2f}")
    if exposure["portfolio_duration_years"] is not None:
        lines.append(
            f"Portfolio bond duration (approx, {exposure['duration_coverage']*100:.0f}% of bond "
            f"value covered by known ETF durations): {exposure['portfolio_duration_years']:.1f} years"
        )
    lines.append("")
    lines.append("By asset class: " + ", ".join(
        f"{k} {v/exposure['total_value']*100:.0f}%" for k, v in exposure["by_asset_class"].items()
    ) if exposure["total_value"] > 0 else "By asset class: n/a")
    lines.append("By region: " + ", ".join(
        f"{k} {v/exposure['total_value']*100:.0f}%" for k, v in exposure["by_region"].items()
    ) if exposure["total_value"] > 0 else "By region: n/a")
    lines.append("")
    lines.append("Holdings:")
    for h in exposure["holdings"]:
        price_str = f"${h['price']:.2f}" if h["price"] is not None else "price unavailable"
        lines.append(f"- {h['ticker']}: {h['quantity']} units @ {price_str}, {h['weight']*100:.1f}% of portfolio")
    return "\n".join(lines)

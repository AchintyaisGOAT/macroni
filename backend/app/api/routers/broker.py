import logging

from dotenv import set_key
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.broker import angel_one
from app.broker.angel_one import AngelAuthError, AngelNotConfigured
from app.config import env_file_path, settings
from app.db import get_db
from app.portfolio.holdings import replace_all_holdings

logger = logging.getLogger("app.api.broker")

router = APIRouter(prefix="/api/broker", tags=["broker"])


class CredentialsIn(BaseModel):
    api_key: str
    client_code: str
    mpin: str
    totp_secret: str


def _reraise_as_http(exc: Exception):
    if isinstance(exc, AngelNotConfigured):
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if isinstance(exc, AngelAuthError):
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    logger.exception("Angel One request failed")
    raise HTTPException(status_code=502, detail=f"could not reach Angel One: {exc}") from exc


@router.get("/status")
def get_status():
    return {
        "configured": settings.has_angel_credentials,
        "connected": angel_one.is_connected(),
        "client_code": settings.angel_client_code if settings.has_angel_credentials else None,
    }


@router.post("/credentials")
def save_credentials(payload: CredentialsIn):
    api_key = payload.api_key.strip()
    client_code = payload.client_code.strip()
    mpin = payload.mpin.strip()
    totp_secret = payload.totp_secret.strip()
    if not (api_key and client_code and mpin and totp_secret):
        raise HTTPException(status_code=400, detail="all four fields are required")

    env_path = env_file_path()
    env_path.touch(exist_ok=True)
    set_key(str(env_path), "ANGEL_API_KEY", api_key)
    set_key(str(env_path), "ANGEL_CLIENT_CODE", client_code)
    set_key(str(env_path), "ANGEL_MPIN", mpin)
    set_key(str(env_path), "ANGEL_TOTP_SECRET", totp_secret)

    settings.angel_api_key = api_key
    settings.angel_client_code = client_code
    settings.angel_mpin = mpin
    settings.angel_totp_secret = totp_secret

    try:
        angel_one.get_client(force_relogin=True)
    except Exception as exc:
        _reraise_as_http(exc)
    return {"status": "connected"}


@router.get("/holdings")
def get_holdings():
    try:
        return angel_one.fetch_holdings()
    except Exception as exc:
        _reraise_as_http(exc)


@router.get("/positions")
def get_positions():
    try:
        return angel_one.fetch_positions()
    except Exception as exc:
        _reraise_as_http(exc)


@router.get("/funds")
def get_funds():
    try:
        return angel_one.fetch_funds()
    except Exception as exc:
        _reraise_as_http(exc)


@router.post("/sync-to-portfolio")
def sync_to_portfolio(db: Session = Depends(get_db)):
    try:
        raw_holdings = angel_one.fetch_holdings()
    except Exception as exc:
        _reraise_as_http(exc)

    mapped: list[dict] = []
    unmapped: list[dict] = []
    for h in raw_holdings:
        quantity = h.get("quantity") or 0
        ticker = angel_one.map_to_yahoo_ticker(h.get("tradingsymbol", ""), h.get("exchange", ""))
        if ticker is None:
            unmapped.append(
                {"tradingsymbol": h.get("tradingsymbol"), "exchange": h.get("exchange"), "quantity": quantity}
            )
            continue
        mapped.append({"ticker": ticker, "quantity": float(quantity), "asset_class": "equity", "region": "IN"})

    holdings = replace_all_holdings(db, mapped)
    return {"status": "ok", "synced": len(holdings), "unmapped": unmapped}

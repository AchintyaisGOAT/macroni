import logging

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai.client import call_proxy

logger = logging.getLogger("app.api.support")

router = APIRouter(prefix="/api/support", tags=["support"])


class SupportIn(BaseModel):
    sender_email: str
    message: str


@router.post("")
def post_support(payload: SupportIn):
    try:
        return call_proxy("/v1/support", {"sender_email": payload.sender_email, "message": payload.message})
    except requests.HTTPError as exc:
        try:
            detail = exc.response.json().get("detail", exc.response.text)
        except Exception:
            detail = str(exc)
        status_code = exc.response.status_code if exc.response is not None else 502
        raise HTTPException(status_code=status_code, detail=detail) from exc
    except requests.RequestException as exc:
        logger.exception("failed to reach the support endpoint on the AI proxy")
        raise HTTPException(status_code=502, detail=f"could not reach the support service: {exc}") from exc

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.schemas import InvestmentTip
from app.db import get_db
from app.models.tips import InvestmentTipsRecord
from app.scheduler import refresh_investment_tips

router = APIRouter(prefix="/api/tips", tags=["tips"])


class TipsOut(BaseModel):
    tips: list[InvestmentTip]
    created_at: str | None


@router.get("", response_model=TipsOut)
def get_tips(db: Session = Depends(get_db)):
    row = db.query(InvestmentTipsRecord).order_by(InvestmentTipsRecord.created_at.desc()).first()
    if not row:
        return TipsOut(tips=[], created_at=None)
    return TipsOut(tips=json.loads(row.tips_json), created_at=row.created_at.isoformat())


@router.post("/refresh")
def post_tips_refresh():
    return refresh_investment_tips()

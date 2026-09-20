from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.news import NewsItem

router = APIRouter(prefix="/api/news", tags=["news"])


class NewsOut(BaseModel):
    id: int
    source: str
    title: str
    link: str
    summary: str
    image_url: str | None
    published_at: str | None


@router.get("", response_model=list[NewsOut])
def get_news(db: Session = Depends(get_db), limit: int = 30, source: str | None = None):
    query = db.query(NewsItem)
    if source:
        query = query.filter(NewsItem.source == source)
    rows = query.order_by(NewsItem.published_at.desc()).limit(limit).all()
    return [
        NewsOut(
            id=r.id,
            source=r.source,
            title=r.title,
            link=r.link,
            summary=r.summary,
            image_url=r.image_url,
            published_at=r.published_at.isoformat() if r.published_at else None,
        )
        for r in rows
    ]

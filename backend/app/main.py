import logging
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import alerts, chat, dashboard, news, portfolio, tips
from app.db import init_db
from app.scheduler import create_scheduler, run_startup_refresh

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app.main")

_scheduler = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    init_db()
    threading.Thread(target=run_startup_refresh, daemon=True).start()
    _scheduler = create_scheduler()
    _scheduler.start()
    logger.info("scheduler started")
    yield
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)


app = FastAPI(title="MACRONI", lifespan=lifespan)

# Dev mode: Vite dev server (5173) talks to this API (8000) cross-origin.
# The packaged build serves the frontend from this same FastAPI process, so CORS
# is irrelevant there but harmless to leave enabled.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router)
app.include_router(portfolio.router)
app.include_router(alerts.router)
app.include_router(news.router)
app.include_router(tips.router)
app.include_router(chat.router)


def _frontend_dist_dir() -> Path | None:
    base = Path(sys._MEIPASS) if getattr(sys, "frozen", False) else Path(__file__).resolve().parent.parent.parent
    dist = base / "frontend" / "dist"
    return dist if dist.exists() else None


_dist_dir = _frontend_dist_dir()
if _dist_dir is not None:
    app.mount("/", StaticFiles(directory=str(_dist_dir), html=True), name="frontend")
else:
    logger.info("frontend/dist not found - run the Vite dev server separately in dev mode")

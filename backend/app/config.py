import os
import sys
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _is_frozen() -> bool:
    return getattr(sys, "frozen", False)


def _app_dir() -> Path:
    """Where user-editable config (.env) and the database live.

    Dev mode: the project root (backend/..), so `.env` next to the repo works as-is.
    Packaged mode: `Path(__file__)` points inside the frozen bundle, not anything on
    real disk next to the installed .exe - so a packaged app's config instead lives
    next to the executable (dev-editable after install) and its database in the
    user's per-user app-data folder (writable without admin rights, survives updates
    that replace the install directory).
    """
    if _is_frozen():
        return Path(sys.executable).resolve().parent
    return BACKEND_DIR.parent


def get_app_version() -> str:
    version_file = _app_dir() / "VERSION"
    if version_file.exists():
        return version_file.read_text().strip()
    return "0.0.0"


# GitHub "owner/repo" that hosts releases for this app - used only by the frontend's
# update-check (a plain, unauthenticated call to the public GitHub releases API).
GITHUB_REPO = "AchintyaisGOAT/macroni"


def _default_database_path() -> str:
    if _is_frozen():
        local_app_data = os.environ.get("LOCALAPPDATA", str(Path.home()))
        db_dir = Path(local_app_data) / "AIMacroPortfolioManager"
        db_dir.mkdir(parents=True, exist_ok=True)
        return str(db_dir / "app.db")
    return str(_app_dir() / "data" / "app.db")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_app_dir() / ".env"), extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    fred_api_key: str = ""

    database_path: str = _default_database_path()

    market_refresh_minutes: int = 20
    fred_refresh_hours: int = 6
    news_refresh_minutes: int = 15
    regime_report_minutes: int = 60

    api_host: str = "127.0.0.1"

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path}"

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_fred_key(self) -> bool:
        return bool(self.fred_api_key)


settings = Settings()

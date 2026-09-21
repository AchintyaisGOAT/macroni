from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(table: str, column: str, ddl_type: str) -> None:
    """Add a column to an already-existing table if it's missing.

    Base.metadata.create_all() only creates tables that don't exist yet - it never
    alters an existing one, so a model field added after a table was first created
    (e.g. on an already-installed copy of the app) needs this instead of a full
    migration framework, which would be overkill for this app's schema-change pace.
    """
    with engine.connect() as conn:
        existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
        if column not in existing:
            conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")
            conn.commit()


def init_db() -> None:
    import app.models  # noqa: F401 ensures all models are registered before create_all

    Base.metadata.create_all(bind=engine)
    _ensure_column("news_items", "image_url", "TEXT")
    _ensure_column("trade_guidance", "scope", "TEXT NOT NULL DEFAULT 'portfolio'")

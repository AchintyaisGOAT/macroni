import logging
import time
from collections.abc import Callable
from typing import Any, TypeVar

from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

logger = logging.getLogger("app.data_sources")

T = TypeVar("T")


def retry(fn: Callable[[], T], attempts: int = 3, base_delay: float = 1.5) -> T:
    """Run fn with exponential backoff. Raises the last exception if all attempts fail."""
    last_exc: Exception | None = None
    for attempt in range(attempts):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - deliberately broad, this is a generic retry wrapper
            last_exc = exc
            if attempt < attempts - 1:
                delay = base_delay * (2**attempt)
                logger.warning("attempt %d/%d failed: %s (retrying in %.1fs)", attempt + 1, attempts, exc, delay)
                time.sleep(delay)
    assert last_exc is not None
    raise last_exc


def upsert_rows(
    db: Session,
    model: type,
    rows: list[dict[str, Any]],
    conflict_columns: list[str],
    update_columns: list[str] | None = None,
) -> int:
    """Insert rows into a SQLite table, upserting on conflict_columns.

    If update_columns is None, conflicting rows are left untouched (insert-or-ignore).
    Otherwise the listed columns are overwritten with the new values (e.g. revised data).
    """
    if not rows:
        return 0

    # SQLite caps bound parameters per statement (SQLITE_MAX_VARIABLE_NUMBER, historically
    # 999) - a single bulk INSERT over a long FRED history (decades of monthly data) can
    # easily exceed that. Chunk rows so each statement stays comfortably under the limit.
    num_columns = len(rows[0])
    chunk_size = max(1, 900 // num_columns)

    total_affected = 0
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i : i + chunk_size]
        stmt = sqlite_insert(model).values(chunk)
        if update_columns:
            stmt = stmt.on_conflict_do_update(
                index_elements=conflict_columns,
                set_={col: getattr(stmt.excluded, col) for col in update_columns},
            )
        else:
            stmt = stmt.on_conflict_do_nothing(index_elements=conflict_columns)

        result = db.execute(stmt)
        total_affected += result.rowcount or 0

    db.commit()
    return total_affected

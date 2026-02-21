"""Database persistence helpers for replacing JSON file I/O."""

import logging

logger = logging.getLogger(__name__)


def db_load(key: str):
    """Load a value from the AppConfigDB key-value store."""
    try:
        from src.database import get_db
        from src.db_models import AppConfigDB
        with get_db() as db:
            row = db.query(AppConfigDB).filter_by(key=key).first()
            return row.value if row else None
    except Exception as e:
        logger.warning(f"Could not load '{key}' from database: {e}")
        return None


def db_save(key: str, value):
    """Save a value to the AppConfigDB key-value store."""
    try:
        from src.database import get_db
        from src.db_models import AppConfigDB
        from datetime import datetime
        with get_db() as db:
            row = db.query(AppConfigDB).filter_by(key=key).first()
            if row:
                row.value = value
                row.updated_at = datetime.utcnow()
            else:
                db.add(AppConfigDB(key=key, value=value))
    except Exception as e:
        logger.warning(f"Could not save '{key}' to database: {e}")

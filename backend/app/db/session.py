from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


_engine_options = {
    "pool_pre_ping": True,
}
if not settings.database_url.startswith("sqlite"):
    _engine_options.update(
        pool_recycle=280,
        pool_size=10,
        max_overflow=20,
    )

engine = create_engine(settings.database_url, **_engine_options)


SessionLocal = sessionmaker(
    bind=engine,
    class_=Session,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[
    Session,
    None,
    None,
]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
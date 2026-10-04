import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.ml.model_loader import get_classifier


TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
    },
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    class_=Session,
)


@pytest.fixture(autouse=True)
def test_environment(
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "environment",
        "test",
    )

    get_classifier.cache_clear()

    yield

    get_classifier.cache_clear()


@pytest.fixture(autouse=True)
def database():
    Base.metadata.create_all(
        bind=engine,
    )

    yield

    Base.metadata.drop_all(
        bind=engine,
    )


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()

        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[
        get_db
    ] = override_get_db

    with TestClient(
        app,
    ) as test_client:
        yield test_client

    app.dependency_overrides.clear()
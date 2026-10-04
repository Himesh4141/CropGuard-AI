from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    alerts,
    auth,
    diagnoses,
    farms,
    fields,
    health,
    officer,
    risk,
    users,
    weather,
)


router = APIRouter()

router.include_router(
    health.router,
    tags=[
        "health",
    ],
)

router.include_router(
    auth.router,
    prefix="/auth",
    tags=[
        "auth",
    ],
)

router.include_router(
    users.router,
    prefix="/users",
    tags=[
        "users",
    ],
)

router.include_router(
    farms.router,
    prefix="/farms",
    tags=[
        "farms",
    ],
)

router.include_router(
    fields.router,
    prefix="/fields",
    tags=[
        "fields",
    ],
)

router.include_router(
    diagnoses.router,
    prefix="/diagnoses",
    tags=[
        "diagnoses",
    ],
)

router.include_router(
    alerts.router,
    prefix="/alerts",
    tags=[
        "alerts",
    ],
)

router.include_router(
    risk.router,
    prefix="/risk",
    tags=[
        "risk",
    ],
)

router.include_router(
    weather.router,
    prefix="/weather",
    tags=[
        "weather",
        "risk",
    ],
)

router.include_router(
    officer.router,
    prefix="/officer",
    tags=[
        "officer",
    ],
)

router.include_router(
    admin.router,
    prefix="/admin",
    tags=[
        "admin",
    ],
)

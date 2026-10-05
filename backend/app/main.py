from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import (
    FastAPI,
    HTTPException,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from fastapi.responses import (
    FileResponse,
    JSONResponse,
    Response,
)
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging


configure_logging()


PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

FRONTEND_DIST = (
    PROJECT_ROOT
    / "frontend"
    / "dist"
)

FRONTEND_ASSETS = (
    FRONTEND_DIST
    / "assets"
)

SERVE_FRONTEND = (
    settings.environment
    == "production"
    and FRONTEND_DIST.is_dir()
)


@asynccontextmanager
async def lifespan(
    _app: FastAPI,
):
    settings.upload_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=(
        "/docs"
        if settings.environment
        != "production"
        else None
    ),
    redoc_url=(
        "/redoc"
        if settings.environment
        != "production"
        else None
    ),
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        settings.cors_origins
    ),
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
    ],
)


app.include_router(
    api_router,
)


if (
    SERVE_FRONTEND
    and FRONTEND_ASSETS.is_dir()
):
    app.mount(
        "/assets",
        StaticFiles(
            directory=
                FRONTEND_ASSETS,
        ),
        name="frontend-assets",
    )


@app.get(
    "/",
    include_in_schema=False,
)
def root() -> Response:
    if SERVE_FRONTEND:
        return FileResponse(
            FRONTEND_DIST
            / "index.html"
        )

    return JSONResponse(
        {
            "name":
                settings.app_name,
            "status":
                "running",
        }
    )


@app.get(
    "/{full_path:path}",
    include_in_schema=False,
)
def frontend_spa(
    full_path: str,
) -> Response:
    if not SERVE_FRONTEND:
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )

    if (
        full_path.startswith(
            "api/",
        )
        or full_path
        in {
            "docs",
            "redoc",
            "openapi.json",
        }
    ):
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )

    dist_root = (
        FRONTEND_DIST.resolve()
    )

    requested_file = (
        FRONTEND_DIST
        / full_path
    ).resolve()

    if (
        requested_file
        .is_relative_to(
            dist_root,
        )
        and requested_file
        .is_file()
    ):
        return FileResponse(
            requested_file,
        )

    return FileResponse(
        FRONTEND_DIST
        / "index.html"
    )
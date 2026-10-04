from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.integrations.weather.client import (
    build_weather_provider,
)
from app.integrations.weather.provider import (
    WeatherProvider,
)
from app.models.user import User
from app.schemas.weather import (
    FieldWeatherRiskResponse,
)
from app.services.weather_service import (
    WeatherService,
)


router = APIRouter()


def get_weather_provider() -> WeatherProvider:
    return build_weather_provider()


@router.get(
    "/fields/{field_id}",
    response_model=(
        FieldWeatherRiskResponse
    ),
)
def field_weather_and_risk(
    field_id: UUID,
    user: User = Depends(
        get_current_user,
    ),
    db: Session = Depends(
        get_db,
    ),
    provider: WeatherProvider = Depends(
        get_weather_provider,
    ),
) -> FieldWeatherRiskResponse:
    try:
        return WeatherService(
            db,
            provider,
        ).get_field_weather(
            user.id,
            field_id,
        )

    except NotFoundError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc,
            ),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status
                .HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=str(
                exc,
            ),
        ) from exc
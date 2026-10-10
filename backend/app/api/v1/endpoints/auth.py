from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
)
from app.core.security import (
    TokenDecodeError,
    decode_token,
)
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    MobileRefreshRequest,
    MobileTokenResponse,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import (
    AuthService,
    TokenPair,
)


router = APIRouter()


def _cookie_samesite() -> str:
    """
    Local development:
        SameSite=Lax
        Secure=False

    Cloud production:
        SameSite=None
        Secure=True

    This allows the Vercel frontend to use the Render
    refresh-token cookie across HTTPS origins.
    """
    if settings.cookie_secure:
        return "none"

    return "lax"


def _set_refresh_cookie(
    response: Response,
    refresh_token: str,
) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=_cookie_samesite(),
        max_age=(
            settings.refresh_token_days
            * 24
            * 60
            * 60
        ),
        path=(
            f"{settings.api_v1_prefix}/auth"
        ),
    )


def _response(
    user,
    tokens: TokenPair,
) -> TokenResponse:
    return TokenResponse(
        access_token=tokens.access_token,
        expires_in=tokens.expires_in,
        user=user,
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)

    try:
        user = service.register(
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
        )
    except (
        ConflictError,
        ValueError,
    ) as exc:
        code = (
            status.HTTP_409_CONFLICT
            if isinstance(
                exc,
                ConflictError,
            )
            else status.HTTP_400_BAD_REQUEST
        )

        raise HTTPException(
            status_code=code,
            detail=str(exc),
        ) from exc

    tokens = service.issue_tokens(
        user,
    )

    _set_refresh_cookie(
        response,
        tokens.refresh_token,
    )

    return _response(
        user,
        tokens,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)

    try:
        user = service.authenticate(
            email=payload.email,
            password=payload.password,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    tokens = service.issue_tokens(
        user,
    )

    _set_refresh_cookie(
        response,
        tokens.refresh_token,
    )

    return _response(
        user,
        tokens,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    raw = request.cookies.get(
        settings.refresh_cookie_name,
    )

    if not raw:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "Refresh session not found",
        )

    try:
        payload = decode_token(
            raw,
            expected_type="refresh",
        )

        user_id = UUID(
            str(
                payload["sub"],
            )
        )

        jti = str(
            payload["jti"],
        )

        user, tokens = (
            AuthService(db)
            .rotate_refresh(
                user_id=user_id,
                jti=jti,
            )
        )

    except (
        TokenDecodeError,
        AuthenticationError,
        ValueError,
        KeyError,
    ) as exc:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=
                "Refresh session is invalid",
        ) from exc

    _set_refresh_cookie(
        response,
        tokens.refresh_token,
    )

    return _response(
        user,
        tokens,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    raw = request.cookies.get(
        settings.refresh_cookie_name,
    )

    if raw:
        try:
            payload = decode_token(
                raw,
                expected_type="refresh",
            )

            jti = str(
                payload["jti"],
            )

            AuthService(db).revoke_refresh(
                jti,
            )

        except (
            TokenDecodeError,
            KeyError,
        ):
            pass

    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=(
            f"{settings.api_v1_prefix}/auth"
        ),
        secure=settings.cookie_secure,
        httponly=True,
        samesite=_cookie_samesite(),
    )

    return MessageResponse(
        message="Signed out",
    )

# Native apps do not rely on third-party refresh cookies. Mobile refresh tokens
# are returned once over HTTPS and MUST be stored in Android Keystore-backed
# storage, never localStorage, app preferences plaintext, or logs.
def _mobile_response(user, tokens: TokenPair) -> MobileTokenResponse:
    return MobileTokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
        user=user,
    )


@router.post("/mobile/login", response_model=MobileTokenResponse)
def mobile_login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> MobileTokenResponse:
    try:
        user = AuthService(db).authenticate(
            email=payload.email, password=payload.password,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        ) from exc
    tokens = AuthService(db).issue_tokens(user)
    return _mobile_response(user, tokens)


@router.post(
    "/mobile/register",
    response_model=MobileTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def mobile_register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
) -> MobileTokenResponse:
    try:
        service = AuthService(db)
        user = service.register(
            email=payload.email,
            full_name=payload.full_name,
            password=payload.password,
        )
    except (ConflictError, ValueError) as exc:
        raise HTTPException(
            status_code=(409 if isinstance(exc, ConflictError) else 400),
            detail=str(exc),
        ) from exc
    return _mobile_response(user, service.issue_tokens(user))


@router.post("/mobile/refresh", response_model=MobileTokenResponse)
def mobile_refresh(
    payload: MobileRefreshRequest,
    db: Session = Depends(get_db),
) -> MobileTokenResponse:
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
        user_id = UUID(str(claims["sub"]))
        jti = str(claims["jti"])
        user, tokens = AuthService(db).rotate_refresh(
            user_id=user_id, jti=jti,
        )
    except (TokenDecodeError, AuthenticationError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session is invalid",
        ) from exc
    return _mobile_response(user, tokens)


@router.post("/mobile/logout", response_model=MessageResponse)
def mobile_logout(
    payload: MobileRefreshRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    # Idempotent logout; never expose token validity to clients.
    try:
        claims = decode_token(payload.refresh_token, expected_type="refresh")
        AuthService(db).revoke_refresh(str(claims["jti"]))
    except (TokenDecodeError, KeyError):
        pass
    return MessageResponse(message="Signed out")

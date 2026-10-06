"""Provision the two canonical CropGuard privileged accounts.

This script expects DATABASE_URL to point at the target database. It preserves
farmer accounts, disables every other admin/officer account, revokes privileged
refresh sessions, and resets the two canonical passwords.
"""

from datetime import datetime, timezone
import secrets
import string

from sqlalchemy import select

from app.core.constants import UserRole
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.refresh_token import RefreshToken
from app.models.user import User

ADMIN_EMAIL = "admin@cropguard.example.com"
OFFICER_EMAIL = "officer@cropguard.example.com"


def strong_password(length: int = 28) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*_-+="
    while True:
        value = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(char.isupper() for char in value)
            and any(char.islower() for char in value)
            and any(char.isdigit() for char in value)
            and any(char in "!@#$%^&*_-+=" for char in value)
        ):
            return value


def revoke_sessions(db, user_id) -> None:
    now = datetime.now(timezone.utc)
    tokens = list(
        db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        ).all()
    )
    for token in tokens:
        token.revoked_at = now
        db.add(token)


def upsert_privileged(
    db,
    *,
    email: str,
    full_name: str,
    role: UserRole,
    password: str,
    service_state: str | None = None,
    service_district: str | None = None,
    service_latitude: float | None = None,
    service_longitude: float | None = None,
    coverage_radius_km: float | None = None,
) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
    else:
        user.full_name = full_name
        user.password_hash = hash_password(password)
        user.role = role
        user.is_active = True

    user.service_state = service_state
    user.service_district = service_district
    user.service_latitude = service_latitude
    user.service_longitude = service_longitude
    user.coverage_radius_km = coverage_radius_km
    db.add(user)
    db.flush()
    revoke_sessions(db, user.id)
    return user


def main() -> None:
    admin_password = strong_password()
    officer_password = strong_password()
    allowed = {ADMIN_EMAIL, OFFICER_EMAIL}

    with SessionLocal() as db:
        privileged = list(
            db.scalars(
                select(User).where(
                    User.role.in_([UserRole.ADMIN, UserRole.EXTENSION_OFFICER])
                )
            ).all()
        )

        disabled = []
        for user in privileged:
            if user.email.lower() not in allowed:
                user.is_active = False
                db.add(user)
                revoke_sessions(db, user.id)
                disabled.append(user.email)

        upsert_privileged(
            db,
            email=ADMIN_EMAIL,
            full_name="System Administrator",
            role=UserRole.ADMIN,
            password=admin_password,
        )
        upsert_privileged(
            db,
            email=OFFICER_EMAIL,
            full_name="Hyderabad Extension Officer",
            role=UserRole.EXTENSION_OFFICER,
            password=officer_password,
            service_state="Telangana",
            service_district="Hyderabad",
            service_latitude=17.3850,
            service_longitude=78.4867,
            coverage_radius_km=50.0,
        )
        db.commit()

    print()
    print("=" * 68)
    print("CROPGUARD PRIVILEGED ACCESS READY")
    print("=" * 68)
    print(f"Disabled old privileged accounts: {len(disabled)}")
    for email in disabled:
        print(f"  - {email}")
    print()
    print("SAVE THESE NEW PASSWORDS NOW. DO NOT COMMIT OR SHARE THEM.")
    print()
    print(f"Admin email:    {ADMIN_EMAIL}")
    print(f"Admin password: {admin_password}")
    print()
    print(f"Officer email:    {OFFICER_EMAIL}")
    print(f"Officer password: {officer_password}")
    print("Officer area:     Hyderabad, Telangana · 50 km nearby radius")
    print("=" * 68)


if __name__ == "__main__":
    main()

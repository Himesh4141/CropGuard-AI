"""Resolve a *verified* Firebase identity into an existing CropGuard account.

No schema migration. Only a never-used random password hash is created for
new Farmer accounts. This module does NOT verify JWTs: callers MUST validate
Firebase signatures, audience, issuer, expiry and email_verified first.
"""
from secrets import token_urlsafe

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.core.exceptions import AuthenticationError
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.firebase_identity import FirebaseIdentity


def resolve_firebase_user(db: Session, identity: FirebaseIdentity) -> User:
    """Match by verified, normalized email; do not change existing roles."""
    email = identity.email.strip().casefold()
    if not email or "@" not in email or len(email) > 320:
        raise AuthenticationError("Firebase identity is invalid")

    users = UserRepository(db)
    user = users.get_by_email(email)
    if user is None:
        # This password is not given to anyone; legacy password login remains
        # available for established accounts, but not for new federated users.
        candidate = User(
            email=email,
            full_name="CropGuard Farmer",
            password_hash=hash_password(token_urlsafe(48)),
            role=UserRole.FARMER,
            is_active=True,
        )
        try:
            user = users.add(candidate)
        except IntegrityError:
            # A concurrent verified sign-in may have created this account.
            # Never overwrite a pre-existing role, hash, profile, or user ID.
            db.rollback()
            user = users.get_by_email(email)
            if user is None:
                raise

    if not user.is_active:
        raise AuthenticationError("Account is unavailable")
    return user

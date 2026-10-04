from sqlalchemy.orm import Session

from app.core.constants import UserRole
from app.core.security import hash_password
from app.models.user import User


def ensure_admin(db: Session, *, email: str, password: str, full_name: str = "CropGuard Admin") -> User:
    existing = db.query(User).filter(User.email == email.lower()).first()
    if existing:
        return existing
    user = User(
        email=email.lower(),
        full_name=full_name,
        password_hash=hash_password(password),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

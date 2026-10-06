from sqlalchemy import Boolean, Enum, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import UserRole
from app.db.base import Base, UUIDTimestampMixin


class User(UUIDTimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), default=UserRole.FARMER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Extension-officer service area. These remain NULL for farmers/admins.
    service_state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    service_district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    service_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    service_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    coverage_radius_km: Mapped[float | None] = mapped_column(Float, nullable=True)

    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

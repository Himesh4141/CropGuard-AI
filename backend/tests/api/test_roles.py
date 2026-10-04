from app.core.constants import UserRole
from app.core.security import hash_password
from app.models.user import User
from tests.conftest import TestingSessionLocal


def create_role_user(
    *,
    email: str,
    full_name: str,
    role: UserRole,
    password: str = "StrongPass123",
) -> None:
    with TestingSessionLocal() as db:
        db.add(
            User(
                email=email,
                full_name=full_name,
                password_hash=hash_password(
                    password,
                ),
                role=role,
                is_active=True,
            )
        )
        db.commit()


def login(
    client,
    *,
    email: str,
    password: str = "StrongPass123",
) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
        },
    )

    assert response.status_code == 200

    return {
        "Authorization": (
            "Bearer "
            + response.json()[
                "access_token"
            ]
        )
    }


def test_farmer_cannot_access_admin(
    client,
):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email":
                "farmer-role@example.com",
            "full_name":
                "Role Farmer",
            "password":
                "StrongPass123",
        },
    )

    assert register.status_code == 201

    headers = {
        "Authorization": (
            "Bearer "
            + register.json()[
                "access_token"
            ]
        )
    }

    response = client.get(
        "/api/v1/admin/summary",
        headers=headers,
    )

    assert response.status_code == 403


def test_admin_summary_and_users(
    client,
):
    create_role_user(
        email="admin@example.com",
        full_name="Admin User",
        role=UserRole.ADMIN,
    )

    headers = login(
        client,
        email="admin@example.com",
    )

    summary = client.get(
        "/api/v1/admin/summary",
        headers=headers,
    )

    assert summary.status_code == 200
    assert summary.json()[
        "admins"
    ] == 1

    users = client.get(
        "/api/v1/admin/users",
        headers=headers,
    )

    assert users.status_code == 200
    assert len(
        users.json()
    ) == 1


def test_officer_dashboard_access(
    client,
):
    create_role_user(
        email="officer@example.com",
        full_name="Officer User",
        role=(
            UserRole.EXTENSION_OFFICER
        ),
    )

    headers = login(
        client,
        email="officer@example.com",
    )

    summary = client.get(
        "/api/v1/officer/summary",
        headers=headers,
    )

    assert summary.status_code == 200

    cases = client.get(
        "/api/v1/officer/cases",
        headers=headers,
    )

    assert cases.status_code == 200
    assert cases.json() == []

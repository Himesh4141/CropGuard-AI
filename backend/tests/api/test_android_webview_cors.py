from fastapi.testclient import TestClient
from app.main import app


def test_android_webview_credentialed_login_preflight():
    response = TestClient(app).options(
        "/api/v1/auth/login",
        headers={
            "Origin": "https://localhost",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://localhost"
    assert response.headers["access-control-allow-credentials"] == "true"

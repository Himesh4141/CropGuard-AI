# CropGuard Backend

Production-oriented FastAPI foundation with PostgreSQL, Alembic, JWT access tokens, rotating HTTP-only refresh cookies, farm/field ownership checks, image upload validation, and tests.

## Local setup (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

API: http://localhost:8000/api/v1/health  
Docs in development: http://localhost:8000/docs

For PostgreSQL, start the root Docker Compose database first. For a quick smoke test without PostgreSQL, set `DATABASE_URL=sqlite:///./cropguard.db` in `.env`.

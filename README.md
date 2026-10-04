<div align="center">

# 🌿 CropGuard AI

### AI-Powered Crop Disease Detection & Weather Risk Intelligence

**A production-style smart-agriculture platform for crop-health screening, field risk monitoring, alerts, and role-based farm operations.**

[![GitHub](https://img.shields.io/badge/GitHub-Himesh4141-181717?style=for-the-badge&logo=github)](https://github.com/Himesh4141)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![ONNX](https://img.shields.io/badge/ONNX-Runtime-005CED?style=for-the-badge&logo=onnx&logoColor=white)](https://onnxruntime.ai/)

[![Stars](https://img.shields.io/github/stars/Himesh4141/CropGuard-AI?style=flat-square)](https://github.com/Himesh4141/CropGuard-AI/stargazers)
[![Forks](https://img.shields.io/github/forks/Himesh4141/CropGuard-AI?style=flat-square)](https://github.com/Himesh4141/CropGuard-AI/network/members)
[![Last Commit](https://img.shields.io/github/last-commit/Himesh4141/CropGuard-AI?style=flat-square)](https://github.com/Himesh4141/CropGuard-AI/commits/main)

</div>

---

## 🌱 What is CropGuard AI?

**CropGuard AI** is a full-stack crop-health intelligence platform designed to help farmers and agricultural support teams monitor field conditions, screen tomato leaf images for disease patterns, evaluate weather-driven disease pressure, and act on alerts from one unified application.

The project combines:

- 🧠 **AI image screening** with a MobileNetV3 model exported to ONNX
- 🌦️ **Live weather intelligence** from Open-Meteo
- 📊 **Field-level disease-risk scoring**
- 🔔 **Automatic crop-health alerts**
- 👨‍🌾 **Farmer workflows**
- 🧑‍🔬 **Extension Officer workflows**
- 🛡️ **Administrator controls**
- 🔐 **JWT authentication + role-based access control**
- 🗄️ **MySQL persistence with SQLAlchemy + Alembic migrations**

> [!IMPORTANT]
> **CropGuard is a production-style decision-support prototype, not a field-validated agronomic diagnostic product.**
> The current image model was trained using PlantVillage-style tomato leaf imagery. Real treatment decisions should be confirmed with qualified local agricultural guidance.

---

## ✨ Highlights

| Capability | What CropGuard does |
|---|---|
| 🧠 Disease Detection | Screens tomato leaf images through a trained MobileNetV3 ONNX model |
| 🎯 Confidence Handling | Returns an `uncertain` result when confidence is below the configured threshold |
| 🌦️ Weather Intelligence | Fetches current conditions and a 5-day forecast using Open-Meteo |
| 📈 Disease Risk | Produces a 0–100 weather-driven field risk score with explanatory factors |
| 🔔 Smart Alerts | Creates alerts from elevated weather risk and meaningful disease detections |
| 🌾 Farm Management | Create, update and delete farms and crop fields |
| 📚 Diagnosis History | Stores screening history, confidence, severity, advisory and model provenance |
| 👨‍🌾 Farmer Portal | Farm/field management, disease screening, weather, alerts and profile management |
| 🧑‍🔬 Officer Portal | Cross-farmer case review and high-risk field monitoring |
| 🛡️ Admin Portal | Platform metrics, user overview and account activation/deactivation |
| 🔐 Security | Argon2 password hashing, JWT access tokens, revocable refresh sessions and RBAC |
| 🧪 Quality Checks | pytest, TypeScript type checking, ESLint and Vite production builds |

---

## 👥 Role-Based Experience

### 👨‍🌾 Farmer

Farmers can:

- register and securely sign in
- manage farms and crop fields
- upload tomato leaf images for AI screening
- view disease predictions, confidence, severity and guidance
- review diagnosis history
- view live weather and 5-day forecasts
- monitor disease-risk scores
- receive automatic alerts
- manage profile details and password

### 🧑‍🔬 Extension Officer

Extension Officers can:

- view farmer/farm/field summaries
- review recent crop-health cases
- monitor high-risk fields
- inspect diagnosis confidence and severity
- use weather-risk signals to prioritize farmer support

### 🛡️ Administrator

Administrators can:

- monitor platform-wide metrics
- review farmers, officers and administrators
- inspect farm/field/diagnosis counts
- view alert and high-risk-field totals
- enable or disable user accounts
- access role-protected administration APIs and screens

---

## 🧠 AI Disease Screening

CropGuard uses a **MobileNetV3 Small** image classifier with **ONNX Runtime** for lightweight CPU inference inside the FastAPI backend.

### Supported Tomato Classes

The current model supports 10 PlantVillage tomato classes:

1. Bacterial Spot
2. Early Blight
3. Late Blight
4. Leaf Mold
5. Septoria Leaf Spot
6. Spider Mites / Two-Spotted Spider Mite
7. Target Spot
8. Tomato Yellow Leaf Curl Virus
9. Tomato Mosaic Virus
10. Healthy

### Inference Flow

```mermaid
flowchart LR
    A[📷 Tomato Leaf Image] --> B[FastAPI Upload Validation]
    B --> C[Image Preprocessing]
    C --> D[ONNX Runtime]
    D --> E[MobileNetV3]
    E --> F{Confidence >= Threshold?}
    F -- Yes --> G[Predicted Class]
    F -- No --> H[Uncertain Result]
    G --> I[Severity + Advisory]
    H --> I
    I --> J[(MySQL Diagnosis History)]
```

The backend validates crop compatibility and refuses unsupported crops instead of fabricating predictions.

---

## 🌦️ Weather & Disease-Risk Intelligence

CropGuard connects field coordinates to **Open-Meteo** and evaluates:

- temperature
- relative humidity
- rainfall
- precipitation
- wind speed
- near-term forecast rainfall
- crop-specific sensitivity

The risk engine returns:

```text
Risk Score: 0–100
Risk Level: Low / Moderate / High / Critical
Factors: Human-readable explanations for the score
```

A resilient development fallback is available if the live provider is temporarily unavailable, and the UI clearly distinguishes fallback data from live weather.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    U[👤 User Browser]

    subgraph FE[Frontend]
        R[React + TypeScript + Vite]
        Q[TanStack Query]
        Z[Zustand Auth State]
    end

    subgraph BE[Backend]
        F[FastAPI REST API]
        S[Service Layer]
        RP[Repository Layer]
        AUTH[JWT + Refresh Sessions]
    end

    subgraph DATA[Data & Intelligence]
        DB[(MySQL)]
        ML[ONNX Runtime<br/>MobileNetV3]
        WX[Open-Meteo API]
        IMG[Validated Image Storage]
    end

    U --> R
    R --> Q
    R --> Z
    Q -->|REST / JSON| F
    F --> AUTH
    F --> S
    S --> RP
    RP --> DB
    S --> ML
    S --> WX
    S --> IMG
```

---

## 🛠️ Tech Stack

### Frontend

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-6-CA4245?logo=reactrouter&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-State-443E38)

### Backend

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-REST_API-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2-D71F00)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-4B8BBE)
![Pydantic](https://img.shields.io/badge/Pydantic-v2-E92063?logo=pydantic&logoColor=white)

### Data, ML & Integrations

![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![ONNX](https://img.shields.io/badge/ONNX_Runtime-CPU-005CED?logo=onnx&logoColor=white)
![NumPy](https://img.shields.io/badge/NumPy-2-013243?logo=numpy&logoColor=white)
![Pillow](https://img.shields.io/badge/Pillow-Image_Processing-3776AB)
![Open-Meteo](https://img.shields.io/badge/Open--Meteo-Weather-1E88E5)

---

## 📁 Project Structure

```text
CropGuard/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI routes and dependencies
│   │   ├── core/                 # Settings, security, constants
│   │   ├── db/                   # SQLAlchemy session/base
│   │   ├── integrations/         # Weather / notification adapters
│   │   ├── ml/                   # ONNX classifier + preprocessing
│   │   ├── models/               # ORM models
│   │   ├── repositories/         # Data-access layer
│   │   ├── schemas/              # Pydantic request/response models
│   │   └── services/             # Business logic
│   ├── alembic/                  # Database migrations
│   ├── tests/                    # Backend tests
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Router / application setup
│   │   ├── components/           # Shared UI
│   │   ├── features/             # Feature modules
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
│
├── ml/
│   ├── src/                      # Training / evaluation / export scripts
│   ├── artifacts/                # ONNX model + metadata
│   └── data/                     # Local dataset (not committed)
│
├── docs/                         # Architecture / resume documentation
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Install:

- **Python 3.12+**
- **Node.js 20+**
- **MySQL 8+**
- **Git**
- Optional: **Docker Desktop**

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Himesh4141/CropGuard-AI.git
cd CropGuard-AI
```

### 2️⃣ Configure MySQL

Use your own local MySQL installation or start the database with Docker:

```bash
docker compose up -d db
```

Create a backend environment file:

```powershell
Copy-Item ".\backend\.env.example" ".\backend\.env"
```

Example development configuration:

```env
APP_NAME=CropGuard API
ENVIRONMENT=development
SECRET_KEY=replace-with-a-long-random-development-secret

DATABASE_URL=mysql+pymysql://cropguard_user:YOUR_PASSWORD@127.0.0.1:3306/cropguard?charset=utf8mb4
CORS_ORIGINS=["http://localhost:4141"]

UPLOAD_DIR=uploads
MAX_UPLOAD_MB=8

ML_MODEL_PATH=ml/artifacts/tomato_disease_model.onnx
ML_METADATA_PATH=ml/artifacts/model_metadata.json
ML_MIN_CONFIDENCE=0.55

WEATHER_PROVIDER=open_meteo
WEATHER_FORECAST_DAYS=5
WEATHER_CACHE_MINUTES=15
```

> Never commit real `.env` files or production credentials.

### 3️⃣ Start the Backend

```powershell
cd backend

python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

.\.venv\Scripts\python.exe -m alembic upgrade head

.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

### 4️⃣ Configure and Start the Frontend

```powershell
Copy-Item ".\frontend\.env.example" ".\frontend\.env"

cd frontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 4141
```

Open:

```text
http://localhost:4141
```

Frontend environment:

```env
VITE_APP_NAME=CropGuard AI
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 🧠 ML Model Setup

Runtime inference expects:

```text
ml/artifacts/tomato_disease_model.onnx
ml/artifacts/model_metadata.json
```

The training pipeline uses PlantVillage tomato images with transfer learning on MobileNetV3.

Large local datasets and PyTorch training checkpoints should not be committed to Git.

```text
PlantVillage Tomato Images
        ↓
Train / Validate
        ↓
Evaluate
        ↓
Export to ONNX
        ↓
FastAPI ONNX Runtime Inference
```

---

## 🧪 Testing & Validation

### Backend

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

### Frontend

```powershell
cd frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

### Database Migration Check

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic heads
```

---

## 🐳 Docker

Development:

```bash
docker compose up -d --build
```

Production-style configuration:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Before a real deployment, configure strong secrets, HTTPS, secure cookies, backups, monitoring and production CORS origins.

---

## 🔐 Security Design

CropGuard includes:

- 🔑 Argon2 password hashing
- 🎫 short-lived JWT access tokens
- 🍪 HTTP-only refresh-token cookies
- ♻️ revocable server-side refresh sessions
- 🧑‍⚖️ server-side role checks
- 🌾 farmer resource ownership enforcement
- 📷 image MIME/format/size validation
- 🛑 production configuration checks for unsafe development secrets
- 🔒 environment-based secret configuration

---

## ⚠️ Current Limitations

CropGuard is intentionally presented as a **production-style prototype**.

- the disease model is currently **Tomato-only**
- the model has not been validated on broad real-world field imagery
- PlantVillage imagery can differ significantly from real farm conditions
- weather disease risk is a **rule-based risk engine**, not a trained outbreak forecasting model
- email/SMS notification adapters are not enabled in the current prototype
- production deployments should use durable object storage rather than local uploads
- a real deployment still requires HTTPS, observability, backups, rate limiting, secret management and agronomic validation

---

## 🗺️ Roadmap

- 🌱 additional crop models
- 🛰️ satellite / remote-sensing signals
- 📍 regional disease outbreak maps
- 📱 mobile-first PWA / native application
- 🧠 field-image fine-tuning and model calibration
- 🔍 out-of-distribution detection
- 📊 model drift monitoring
- ☁️ cloud object storage
- 🔔 email / SMS / WhatsApp notifications
- 🚀 CI/CD and managed deployment
- 🌐 multilingual farmer guidance

---

## 💼 Resume Summary

**CropGuard AI — AI-Powered Crop Disease Detection & Risk Monitoring Platform**

- Built a full-stack smart-agriculture platform with **React, TypeScript, FastAPI, SQLAlchemy, MySQL and Alembic**, supporting Farmer, Extension Officer and Admin workflows.
- Integrated a **MobileNetV3 tomato disease classifier through ONNX Runtime** for image-based crop-health screening across 10 tomato classes.
- Developed **live Open-Meteo weather integration**, 5-day forecasting, crop-aware disease-risk scoring and automatic farmer alerts.
- Implemented **JWT authentication, revocable refresh sessions, RBAC, farm/field CRUD, diagnosis history and user administration**.
- Added automated backend tests, TypeScript validation, ESLint, production builds and Docker-based deployment configuration.

---

## 👨‍💻 Author

<div align="center">

### Himesh Gurram

[![GitHub](https://img.shields.io/badge/GitHub-@Himesh4141-181717?style=for-the-badge&logo=github)](https://github.com/Himesh4141)

**If you find CropGuard useful or interesting, consider giving the repository a ⭐.**

</div>

---

<div align="center">

### 🌿 CropGuard AI

**Detect earlier • Understand risk • Support better farm decisions**

</div>

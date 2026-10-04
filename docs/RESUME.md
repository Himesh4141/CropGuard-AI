# CropGuard Resume Notes

## One-line project

**CropGuard AI — Full-stack crop-health intelligence platform using FastAPI, React/TypeScript, MySQL, ONNX Runtime, live weather data and role-based agricultural workflows.**

## Resume bullets

- Built a production-oriented crop-health platform with React/TypeScript, FastAPI, SQLAlchemy, Alembic and MySQL, supporting farmer, extension-officer and administrator roles with ownership- and role-based authorization.
- Integrated a MobileNetV3 tomato disease classifier through ONNX Runtime, including secure image validation, confidence thresholding, model provenance and persisted diagnosis history.
- Combined Open-Meteo current/forecast weather with crop-aware rules to generate 0-100 field disease-risk scores, explanatory factors and automatic High/Critical alerts.
- Implemented refresh-token rotation, Argon2 password hashing, HTTP-only cookie sessions, CRUD workflows, automated API tests, frontend type checking/linting/build validation and Docker configuration.

## Interview talking points

### Why ONNX?
Training and web serving have different requirements. Exporting to ONNX keeps FastAPI inference lightweight and removes the need to ship the full PyTorch training stack in the backend runtime.

### Why not call the model production-accurate?
PlantVillage images differ from real farm images. CropGuard explicitly labels the classifier as a trained prototype and requires representative field validation before agronomic deployment.

### Why a rule-based weather risk engine?
It creates an explainable baseline using temperature, humidity, rainfall, wind and forecast precipitation. A future version can replace or augment this with a validated forecasting model without changing the frontend contract.

### How is authorization handled?
Farmer queries are ownership-scoped in the backend. Officer/admin capabilities are protected by server-side role dependencies; frontend route guards are only an additional UX layer.

### What would you do next?
Field-image data collection, calibrated confidence/OOD detection, model monitoring, object storage, managed database deployment, CI/CD, observability, rate limiting and expert-reviewed advisories.

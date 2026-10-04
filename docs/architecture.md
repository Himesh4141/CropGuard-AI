# CropGuard Architecture

## Request flow

1. React authenticates against FastAPI.
2. FastAPI issues a short-lived access token and an HTTP-only refresh cookie.
3. Farmer-owned farms and fields are authorization-scoped in backend queries.
4. Image uploads are validated before storage.
5. Tomato images are preprocessed with ImageNet normalization and passed to the ONNX MobileNetV3 model.
6. Prediction label, confidence, severity, advisory and model provenance are stored in MySQL.
7. Farm coordinates are sent to Open-Meteo for current conditions and forecast.
8. The risk service combines crop type, temperature, humidity, rainfall, precipitation, wind and forecast rain into a 0-100 decision-support score.
9. Alerts are derived from high/critical weather risk and significant diagnosis events.
10. Extension officers and administrators access aggregate role-protected views.

## Backend layers

```text
API endpoints
    |
Services
    |
Repositories
    |
SQLAlchemy models
    |
MySQL
```

External systems are behind adapters:

```text
WeatherProvider -> Open-Meteo / development fallback
DiseaseClassifier -> ONNX Runtime / deterministic test classifier
StorageProvider -> local development storage
```

This keeps automated tests independent from live weather and model artifacts.

## Data model

Core tables:

- users
- refresh_tokens
- farms
- fields
- diagnoses
- weather_records
- alerts

Important ownership chain:

```text
User
  -> Farms
      -> Fields
          -> Diagnoses
          -> Weather records
          -> Alerts
```

Database foreign keys use cascading deletion for field-owned records.

## ML boundary

The runtime classifier is deliberately isolated behind `DiseaseClassifier`.

Current runtime:
- architecture: MobileNetV3 Small
- format: ONNX
- classes: 10 Tomato PlantVillage classes
- confidence threshold: configurable
- unsupported crops: rejected

The application never presents this prototype as field-validated diagnosis.

## Production hardening still required

A real agricultural production rollout should additionally provide:
- representative field-image validation
- model drift / performance monitoring
- durable object storage
- HTTPS termination
- managed secret storage
- database backups and restore testing
- observability and alerting
- rate limiting / abuse controls
- agronomic review of advisories

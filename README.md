# CropGuard 🌱

**CropGuard** is a student-built crop-health and home-plant-care application delivered as a responsive web app and an Android application. It combines field record-keeping, ML-assisted crop screening, weather/risk information, follow-up care cases, and a **Home Planters** workspace that does not require a farm or field.

**Web:** [CropGuard on GitHub Pages](https://himesh4141.github.io/CropGuard-AI/) · **API:** [Render health endpoint](https://cropguard-api-himesh4141.onrender.com/api/v1/health) · **Instructions:** [Usage guide](docs/USAGE.md) · **Verification:** [Release status](docs/RELEASE_STATUS.md)

> CropGuard provides **screening and decision support**, not a verified laboratory diagnosis. Species-identification confidence and crop-disease model confidence are not guarantees of correctness. Consult local horticultural/agricultural professionals when damage spreads or high-impact treatment decisions are involved.

## Main features

| Workspace | Capabilities |
| --- | --- |
| Farmer | Login/registration, dashboard, farms and fields, image-based crop screening, diagnosis history, weather/risk, alerts, and Crop Care Cases. |
| Home Planters | Take a photo on supported Android devices or upload an image on web; request automated species recognition; record visible symptoms; view care guidance and on-device care-report history **without farm/field linkage**. |
| Extension Officer | Assigned service-area views, care-case queue, guidance, follow-ups, and case resolution subject to location and role permissions. |
| Admin | Dashboard, user management, service-area/location assignment, and global Crop Care Case overview subject to authorization. |
| Account | Profile controls and application navigation appropriate to the signed-in role. |

## Architecture

- **Frontend:** React, TypeScript, Vite; responsive web and Capacitor Android application.
- **Backend:** FastAPI (Python), REST API, role-based authorization, SQLAlchemy and Alembic.
- **Database:** TiDB Cloud (MySQL-compatible) for server-side user/farm/field/case records.
- **ML:** CropGuard Field-Robust v2 supports crop screening. Published scores are dataset/stress-proxy measurements, **not independent real-field accuracy**.
- **Home plant species recognition:** Pl@ntNet API through the backend using the server-side `PLANTNET_API_KEY`. Species recognition is separate from disease identification; visible symptom guidance is not a pathogen diagnosis.
- **Hosting:** GitHub Pages frontend, Render backend. Android uses the same application and HTTPS API service.

## Quick start

See [docs/USAGE.md](docs/USAGE.md) for instructions for farmers, home planters, Officers, Admins, local developers and deployment maintainers.

```powershell
# Frontend development (PowerShell)
cd frontend
npm ci
npm run dev
```

For local backend startup, install dependencies according to the backend's current dependency file, set the required environment variables privately, and run FastAPI from the `backend` directory. **Do not execute database migrations against the production TiDB instance for development.**

## Build and quality checks

```powershell
cd frontend
npm run typecheck
npm run lint
npm run build
```

The Android app is based on Capacitor. **Never commit** release keystores, `.env` files, personal tokens, user images, database dumps, or APK/AAB build outputs. Signing uses the existing private key and a verified local release process; do not replace the Android package identifier when upgrading an existing installation.

## Responsible AI and privacy

- Home Planters images submitted for automatic species recognition are processed by the external Pl@ntNet provider. The app should disclose this before submission. The independent on-device care-history workflow does not require field or farm IDs.
- Pale or yellow pixels can be natural Pothos variegation; image colors alone do not establish disease. Weak identifications must remain uncertain.
- Field ML v2 and Home Planters identification/care workflows must remain separate.
- Never upload secret credentials or release signing keys into the repository.

## Current release status

The latest terminal screenshot confirms a **signed v1.0.6 Android APK and AAB** were created and their signatures verified **after** the dashboard-navigation/care-report-history changes. The user reports the updated APK is working on their phone. The usability batch passed 24 focused offline checks and the frontend typecheck/lint/build. The web update was deployed successfully through GitHub Actions (run `38280084006`). The Admin/Officer offline audit passed **55 checks**, but live end-to-end Officer/Admin account workflows and persistence remain unverified. The latest Home Planters backend confidence refinement has not been confirmed deployed to Render. See [docs/RELEASE_STATUS.md](docs/RELEASE_STATUS.md).

## Project purpose

CropGuard is an educational portfolio / hackathon-style prototype intended to demonstrate full-stack architecture, useful user workflows, careful ML uncertainty handling and mobile delivery. It should not be described as independently certified for clinical, agronomic, or commercial decision-making.

<!-- CROPGUARD RELEASE START -->
## Download and try CropGuard

**Live web application:** https://himesh4141.github.io/CropGuard-AI/

**Android APK v1.0.6:** [Download signed CropGuard APK](https://github.com/Himesh4141/CropGuard-AI/releases/download/v1.0.6/CropGuard-v1.0.6.apk)

**User instructions:** [Usage Guide](docs/USAGE.md)

**Release details:** [Release Status](docs/RELEASE_STATUS.md)

Features include farmer crop management, ML-assisted crop screening, Home Planters automatic identification, care-report history, and role-based Officer/Admin interfaces.

The APK is a test release. Disease predictions are advisory, and live Officer/Admin end-to-end verification remains pending.
<!-- CROPGUARD RELEASE END -->

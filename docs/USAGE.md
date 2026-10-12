# CropGuard — User and Developer Guide

## 1. Open the application

**Web:** https://himesh4141.github.io/CropGuard-AI/

The free Render backend can sleep when idle; the first API request may take longer to respond. Sign in using your registered account. Do not publish passwords or access tokens.

**Android:** The current signed local test build is **v1.0.6**; install a verified **signed** APK built with CropGuard's existing signing key and matching package identifier `com.himesh4141.cropguard`. Back up app data as appropriate before reinstalling. The APK is not automatically updated when GitHub Pages changes. The Home Planters camera uses the Android camera permission.

## 2. Farmer workflow

1. Register or sign in with a farmer account.
2. Open **Farms** to create/manage a farm and **Fields** to manage the monitored fields.
3. Open **Disease Detection** to select the relevant crop/field and provide a focused plant image.
4. Review the crop label, confidence/uncertainty notice, and recommended inspection steps. An uncertain result is **not** a confirmed disease diagnosis.
5. Review **Diagnosis History**, **Alerts**, and **Weather & Risk** when available.
6. Open **Care Cases** for follow-up, symptom changes, further guidance, or escalation.

Avoid pesticide use or irreversible action solely from an app prediction.

## 3. Home Planters workflow (no farm or field required)

1. Open **Home Planters** from the navigation.
2. On Android, tap **Take photo**, or use **Upload image** on web/Android.
3. Choose a clear, well-lit image that shows the leaves and plant shape. Automatic identification is requested through CropGuard's backend and the Pl@ntNet service; internet access is required.
4. Review the **suggested identity, scientific name and provider confidence**. Low-confidence matches must be treated as **possible**, not certain; confirm before using species-specific care advice.
5. Optionally check observed symptoms. Natural Pothos leaf variegation can resemble yellowing in photographs.
6. Read the practical care guidance and suggested follow-up actions. It is symptom screening, **not** verified identification of an infectious pathogen.
7. Open **Care Report History** to review saved reports. History is stored locally on the device/browser, with no farm or field linkage. Clearing app/browser data can erase local history; older summary-only entries may have reduced detail.

Photos submitted to Pl@ntNet leave the device for recognition, but photo bytes should not be stored in Home Planters report history.

## 4. Extension Officer workflow

Sign in using an **extension_officer** account. Use the Officer dashboard and assigned service-area views to review relevant care cases, record guidance, schedule follow-ups and resolve cases where authorized. Cases outside the officer's assigned geographic scope must remain inaccessible. An unassigned officer might see an empty queue or permission restrictions.

## 5. Admin workflow

Sign in using an **admin** account. Use the Admin dashboard to review system summaries, manage user status, assign officer service areas, and monitor care cases across service areas. Disabling a user can revoke their active sessions. Do not deactivate your only administrative account or use production accounts for destructive tests.

## 6. Run frontend locally

Requirements: Node.js and npm installed, repository checked out.

```powershell
cd frontend
npm ci
npm run dev
# Verify quality before release:
npm run typecheck
npm run lint
npm run build
```

Set local **frontend** environment configuration as appropriate. `VITE_API_BASE_URL` should point to the trusted HTTPS API, for example `https://cropguard-api-himesh4141.onrender.com/api/v1` when testing against the deployed service. **Never** place `PLANTNET_API_KEY` in frontend `VITE_*` variables.

## 7. Run backend locally (development environment only)

Requirements: Python and the dependencies specified by the project's backend dependency file. Use a dedicated **development database**, not production TiDB.

```powershell
cd backend
# Activate your prepared .venv, configure a private development .env,
# and install dependencies from the current backend dependency manifest.
python -m uvicorn app.main:app --reload
```

The backend should read `PLANTNET_API_KEY` from its **server-side environment**, together with database and authentication settings. Ask an administrator for credentials; never commit them. If the Pl@ntNet API quota is exhausted or network access fails, recognition must display an unavailable/uncertain state rather than fabricated results.

## 8. Deployment

**Frontend — GitHub Pages:** `.github/workflows/pages.yml` builds the Vite frontend (Node 20 in the captured workflow), performs typecheck/lint/build, and deploys `frontend/dist`. The workflow uses `VITE_API_BASE_URL` pointing to Render and `--base=/CropGuard-AI/`.

**Backend — Render:** Deploy updated FastAPI code separately. Inspect `render.yaml` and the current startup command *before deploying*: the captured Render startup ran `alembic upgrade head` and can change the shared TiDB schema. Only deploy reviewed migrations with an explicit plan and backup.

**Android:** Create the production-configured HTTPS frontend bundle, run Capacitor sync, and build/sign using the existing verified release tooling and private keystore. Validate Android `versionCode` increments, package ID, signing identity, real-camera flow, and actual phone behavior. Preserve prior signed APKs until new releases are verified.

## 9. Troubleshooting

- **Can't reach server:** Check Render health, wake-up delays, HTTPS API configuration, allowed origins, and the phone's connectivity.
- **Home Planters missing from website:** Verify GitHub Actions deployment succeeded for the intended frontend branch; refresh the web application.
- **Recognition unavailable:** Check backend version, `PLANTNET_API_KEY`, provider quota and backend logs. Do not disclose the API key.
- **Low-confidence plant name:** Retake photo with more foliage and better focus; verify with other references.
- **Care Report History empty:** Reports are stored on that browser/device, not in TiDB or shared across devices.
- **Role page inaccessible:** Confirm the signed-in user has the corresponding role and Officer assignment.
- **APK doesn't reflect website changes:** A new APK must be built from updated local source and installed.

### Status as of 2026-10-12

The signed v1.0.6 APK was created and verified; the user reports the phone test succeeded. GitHub Pages deployment run `38280084006` passed. These facts do not establish independent real-field ML accuracy or fully verified live Admin/Officer workflows. The Home Planters backend confidence update still needs separately reviewed Render deployment.

## 10. Release verification checklist

- [x] Frontend typecheck, lint, and production build passed during the one-pass update and GitHub Pages deployment.
- [ ] Backend tests pass; migrations reviewed separately.
- [ ] Web Home Planters recognizes sample Tulsi and Pothos without farm association; 50% scores remain uncertain.
- [ ] Care report saves and reopens; natural variegation is not automatically diagnosed as disease.
- [ ] Farmer cards and Alerts routes work from the dashboard on mobile.
- [ ] Officer/Admin *real* account flows tested safely, without changing live production data.
- [x] Signed v1.0.6 APK was generated and signature-verified; user reports basic Android testing passed. Complete regression testing remains limited.
- [ ] Version and release artifacts are explicitly recorded.

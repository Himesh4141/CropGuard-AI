# CropGuard — Release and Verification Status

**Latest verification:** See [18 October 2026 local completion evidence](VERIFICATION_2026-10-18.md). The older notes below describe earlier releases, not the current local build.

**Recorded:** 2026-10-12 · Based on the user's supplied terminal screenshots and code snapshots. This is an evidence-based checklist, **not** independent certification.

| Area | Evidence observed | Still to verify |
| --- | --- | --- |
| GitHub Pages web | GitHub Actions frontend deployment #25 succeeded and the subsequent one-pass usability deployment run `38280084006` succeeded; live web Home Planters and Pothos result observed. | Current live web dashboard links and care-report history should be manually smoke-tested in a browser after the successful deployment. |
| Home Planters | Android photos, Pl@ntNet-reported Pothos, on-screen care guidance; confidence/variegation refinement tests passed. | Provider response consistency across species, real-world plant-disease accuracy and report-history persistence across restarts. |
| One-pass usability | 24 focused checks passed; frontend typecheck/lint/Vite build passed. | The web deployment succeeded; confirm live behavior and cross-browser persistence separately. |
| Admin/Officer | Earlier offline audit: **55 passed, 0 failed**; includes scoped-access and self-deactivation logic. | Real role logins, server persistence, UI actions and role-based end-to-end flows. |
| Crop ML v2 | Existing ONNX model was previously integrated; controlled evaluation documented in project. | Independent field-photo validation, disease-specific precision by plant/crop. |
| Android | Signed **v1.0.6** APK/AAB created and signatures verified after the one-pass usability updates; user reports the updated APK works on their phone. | Full regression coverage of every Android role and all real-device report-history flows has not been independently verified. |
| Production backend | Render `/api/v1/health` returned 200 in prior user logs. | Latest Home Planters backend confidence updates deployed and live-verified. |

## Known limitations

- A low-confidence species result such as a 50% Pothos suggestion should be treated as a *possible match*, even when a common name is plausible.
- A camera image or normal leaf variegation does not prove a specific plant disease.
- Home Planters report history is on-device/browser and is not synchronized with TiDB.
- This repository contains development tools and an Android release process, but private signing assets must remain outside GitHub.
- The current GitHub branch for web changes is `web-homeplanters-20261011-235722`; merging to `main` may trigger a backend Render redeploy, so review its effects and migrations beforehand.

## Wrap-up criteria

1. Push current reviewed sources + these docs to the working release branch.
2. Run the GitHub Pages workflow on that branch and confirm green.
3. Open a pull request to `main`; review backend migrations and safety before merging.
4. Publish reviewed backend recognition changes separately.
5. Preserve the existing signed v1.0.6 APK; optionally attach it to a GitHub Release only after confirming it is intended for distribution and contains no private material.

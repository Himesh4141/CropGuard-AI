# CropGuard Frontend

React + TypeScript + Vite frontend with strict type checking, environment validation, TanStack Query, in-memory access tokens and refresh-cookie session restoration.

## Run
```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run typecheck
npm run lint
npm run build
npm run dev
```
The backend should be running on `http://localhost:8000`.

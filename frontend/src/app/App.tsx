import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { CropGuardSettings } from "@/features/preferences/CropGuardSettings";
export function App(){ return <><Suspense fallback={<div className="panel" role="status" aria-live="polite">Loading CropGuard…</div>}><RouterProvider router={router}/></Suspense><CropGuardSettings /></>; }

import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/app/queryClient";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { useAuthStore } from "@/features/auth/store";
function AuthBootstrap(){ const initialize=useAuthStore((s)=>s.initialize); useEffect(()=>{ void initialize(); },[initialize]); return null; }
export function AppProviders({children}:{children:ReactNode}){ return <ErrorBoundary><QueryClientProvider client={queryClient}><AuthBootstrap/>{children}</QueryClientProvider></ErrorBoundary>; }

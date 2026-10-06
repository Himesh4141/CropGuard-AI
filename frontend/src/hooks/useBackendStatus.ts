import { useEffect, useState } from "react";

import { warmBackend } from "@/services/backendWarmup";

export type BackendStatus = "starting" | "ready" | "delayed";

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>("starting");

  useEffect(() => {
    const ready = () => setStatus("ready");
    const timeout = () => setStatus("delayed");
    const starting = () => setStatus("starting");

    window.addEventListener("cropguard:backend-ready", ready);
    window.addEventListener("cropguard:backend-timeout", timeout);
    window.addEventListener("cropguard:backend-starting", starting);

    void warmBackend().then((isReady) => {
      setStatus(isReady ? "ready" : "delayed");
    });

    return () => {
      window.removeEventListener("cropguard:backend-ready", ready);
      window.removeEventListener("cropguard:backend-timeout", timeout);
      window.removeEventListener("cropguard:backend-starting", starting);
    };
  }, []);

  return status;
}

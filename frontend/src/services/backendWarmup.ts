import { env } from "@/config/env";
import { recordAuthTiming } from "@/services/authTiming";
/** Render cold-start handling. Health is liveness, not proof that DB/model are ready. */
const API_BASE_URL = env.API_BASE_URL.replace(/\/+$/, "");
const HEALTH_URL = `${API_BASE_URL}/health`;
const MAX_WAIT_MS = 90_000;
const REQUEST_TIMEOUT_MS = 6_500;
let warmupPromise: Promise<boolean> | null = null;
let lastReady = 0;
const dispatch = (event: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(event, { detail }));
const sleep = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));
async function probe(timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(HEALTH_URL, { method: "GET", cache: "no-store", credentials: "omit", signal: controller.signal, headers: { Accept: "application/json" } });
    return response.ok;
  } catch { return false; }
  finally { window.clearTimeout(timeoutId); }
}
export function warmBackend(): Promise<boolean> {
  if (warmupPromise) return warmupPromise;
  // Avoid redundant wake-up loops every time the Settings sheet is reopened.
  if (Date.now() - lastReady < 15_000) return Promise.resolve(true);
  warmupPromise = (async () => {
    const startedAt = performance.now();
    dispatch("cropguard:backend-starting");
    const deadline = Date.now() + MAX_WAIT_MS;
    let attempt = 0;
    while (navigator.onLine !== false && Date.now() < deadline) {
      attempt++;
      const timeLeft = deadline - Date.now();
      if (await probe(Math.max(250, Math.min(REQUEST_TIMEOUT_MS, timeLeft)))) {
        lastReady = Date.now();
        dispatch("cropguard:backend-ready");
        recordAuthTiming("backend-liveness-until-ready", startedAt, "success");
        return true;
      }
      dispatch("cropguard:backend-waiting", { attempt, elapsedSeconds: Math.round((MAX_WAIT_MS - Math.max(0,deadline-Date.now())) / 1000) });
      const delay = Math.min(11_000, 850 * (2 ** Math.min(attempt, 4)), Math.max(0, deadline - Date.now()));
      if (delay) await sleep(delay);
    }
    dispatch("cropguard:backend-timeout");
    recordAuthTiming("backend-liveness-until-ready", startedAt, "timeout");
    return false;
  })().finally(() => { warmupPromise = null; });
  return warmupPromise;
}
// Begin liveness probing while a user explores the web app.
if (typeof window !== "undefined") void warmBackend();

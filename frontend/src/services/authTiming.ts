/** Opt-in, local-only authentication timings. No credentials, identifiers,
 * tokens, response bodies, or URLs are captured or stored. Disabled by default.
 * Enable for the current tab: sessionStorage.setItem("cropguard:auth-timing", "1")
 * and inspect the browser/WebView DevTools console. Disable by removing the key.
 */
export type AuthTimingName =
  | "backend-liveness-until-ready"
  | "login-api-and-secure-store"
  | "login-submit-to-route-request"
  | "session-restore";
export type AuthTimingOutcome = "success" | "error" | "timeout" | "no-session";

export function recordAuthTiming(
  name: AuthTimingName,
  startedAt: number,
  outcome: AuthTimingOutcome,
): void {
  if (typeof window === "undefined" || typeof performance === "undefined") return;
  try {
    if (window.sessionStorage.getItem("cropguard:auth-timing") !== "1") return;
    const elapsedMs = Math.max(0, Math.round(performance.now() - startedAt));
    // Intentionally emit ONLY a fixed label, outcome and duration.
    console.info(`[CropGuard timing] ${name} | ${outcome} | ${elapsedMs} ms`);
  } catch {
    // Private/restricted browser mode: diagnostics are non-essential.
  }
}

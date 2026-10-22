import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store";
import { routes } from "@/config/routes";
import {
  googleEnabled,
  nativeGoogleAvailable,
  nativeGoogleIdToken,
  renderGoogleWebButton,
} from "@/services/googleIdentity";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { t } from "@/i18n";
import { ApiClientError } from "@/services/apiError";
import { firebaseAuthPilotEnabled, firebaseGoogleIdToken } from "@/services/firebaseGoogleFlow";

function getGoogleErrorCode(cause: unknown): string {
  if (typeof cause !== "object" || cause === null || !("code" in cause)) return "";
  const code = cause.code;
  return typeof code === "string" ? code : "";
}

export function GoogleSignIn() {
  const language = useCropGuardLanguage();
  const navigate = useNavigate();
  const setSession = useAuthStore(state => state.setSession);
  const webButton = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const firebaseMode = firebaseAuthPilotEnabled();
  const enabled = firebaseMode || googleEnabled();
  const native = nativeGoogleAvailable();

  // Include native account selection in loading state, not just backend exchange.
  async function signIn(getToken: () => Promise<string>): Promise<void> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const idToken = await getToken();
      const result = firebaseMode
        ? await authApi.firebase(idToken)
        : await authApi.google(idToken);
      setSession(result.user, result.access_token);
      navigate(routes.dashboard, { replace: true });
    } catch (cause) {
      const status = cause instanceof ApiClientError ? cause.status : undefined;
      const code = getGoogleErrorCode(cause);
      if (code === "GOOGLE_CANCELLED") {
        // User dismissed account chooser; no error is necessary.
      } else if (status === 404 || status === 503) {
        setError(t("googleBackendNeeded", language));
      } else if (code === "GOOGLE_CONFIGURATION") {
        setError(t("googleSignInFailed", language) + " Android OAuth configuration: check the release certificate SHA-1 and Google client IDs.");
      } else if (code === "GOOGLE_ACCOUNT_CHOOSER") {
        setError(t("googleSignInFailed", language) + " Check Google Play services and the device's Google accounts.");
      } else {
        setError(t("googleSignInFailed", language));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (firebaseMode || !enabled || native || !webButton.current) return;
    let active = true;
    const onToken = (token: string) => {
      if (active) void signIn(async () => token);
    };
    renderGoogleWebButton(webButton.current, onToken).catch(() => {
      if (active) setError(t("googleUnavailable", language));
    });
    return () => { active = false; };
    // Google Identity Services owns the callback for this mounted button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, native, language]);

  return (
    <section className="cg-google-signin" aria-label={t("googleSignIn", language)}>
      {firebaseMode ? (
        <button
          className="button secondary full"
          disabled={busy}
          type="button"
          onClick={() => { void signIn(firebaseGoogleIdToken); }}
        >
          {busy ? t("googleSigningIn", language) : t("googleSignIn", language)}
        </button>
      ) : native ? (
        <button
          className="button secondary full"
          disabled={busy || !enabled}
          type="button"
          onClick={() => { void signIn(nativeGoogleIdToken); }}
        >
          {busy ? t("googleSigningIn", language) : t("googleSignIn", language)}
        </button>
      ) : enabled ? (
        <div ref={webButton} className="cg-google-gis" />
      ) : (
        <button
          className="button secondary full"
          type="button"
          onClick={() => setError(t("googleBackendNeeded", language))}
        >
          {t("googleSignIn", language)}
        </button>
      )}
      {busy ? <p role="status">{t("googleSigningIn", language)}</p> : null}
      {error ? <p role="alert" className="error-box">{error}</p> : null}
    </section>
  );
}

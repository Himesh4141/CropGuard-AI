import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { t } from "@/i18n";
import { queryClient } from "@/app/queryClient";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";

import {
  authApi,
} from "@/features/auth/api/authApi";

import {
  useAuthStore,
} from "@/features/auth/store";

import {
  ApiClientError,
} from "@/services/apiError";
import { secureSession } from "@/services/secureSession";
import { recordAuthTiming } from "@/services/authTiming";


interface LoginLocationState {
  from?: string;
}


export default function LoginPage() {
  const language = useCropGuardLanguage();
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const setSession =
    useAuthStore(
      (state) =>
        state.setSession,
    );
  const currentUser = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const initializing = useAuthStore((state) => state.initializing);
  const restoreNeedsNetwork = useAuthStore((state) => state.restoreNeedsNetwork);
  const retryRestore = useAuthStore((state) => state.retryRestore);

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [connectionMessage, setConnectionMessage] = useState("");


  useEffect(() => {
    if (!loading) return;
    const handle = window.setTimeout(() => {
      setConnectionMessage(
        "The free API server is waking up. Your login is still being processed securely…",
      );
    }, 12_000);
    return () => window.clearTimeout(handle);
  }, [loading]);

  // Report Render wake-up progress without repeating sign-in POSTs.
  useEffect(() => {
    function onWaiting(event: Event) {
      const detail = (event as CustomEvent<{elapsedSeconds?: number}>).detail;
      const elapsed = Math.max(0, Math.round(detail?.elapsedSeconds ?? 0));
      if (loading) setConnectionMessage(`Server is starting (${elapsed}s). Your sign-in request is not repeated. Please wait or retry if it times out.`);
    }
    function onReady() { if (loading) setConnectionMessage("Server is responding. Completing your secure sign-in…"); }
    window.addEventListener("cropguard:backend-waiting", onWaiting);
    window.addEventListener("cropguard:backend-ready", onReady);
    return () => {
      window.removeEventListener("cropguard:backend-waiting", onWaiting);
      window.removeEventListener("cropguard:backend-ready", onReady);
    };
  }, [loading]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (loading) {
      return;
    }

    const startedAt = performance.now();
    let outcome: "success" | "error" = "error";
    setError("");
    setLoading(true);
    // cropguard:mobile-login-message
    setConnectionMessage(
      t("wakeMessage", language)
    );

    try {
      const data =
        await authApi.login({
          email:
            email
              .trim()
              .toLowerCase(),

          password,
        });

      setSession(
        data.user,
        data.access_token,
      );

      const state =
        location.state as
          | LoginLocationState
          | null;

      const destination =
        state?.from ??
        routes.dashboard;

      // Navigate without waiting for secondary requests. Fetch them in parallel
      // behind the scenes; an unavailable Render server never blocks routing.
      if (data.user.role === "farmer") {
        void import("@/features/farms/api/farmApi").then(({ farmApi }) =>
          queryClient.prefetchQuery({ queryKey: ["farms"], queryFn: farmApi.list }),
        ).catch(() => { /* optional prefetch */ });
      }
      navigate(
        destination,
        {
          replace: true,
        },
      );
      outcome = "success";
    } catch (caughtError) {
      if (
        caughtError instanceof
        ApiClientError
      ) {
        setError(
          caughtError.status === 0
            ? "Can't reach the CropGuard server. Check internet access and try again. If the website signs in but the Android app cannot, the backend's Android-origin access must be deployed."
            : caughtError.message,
        );
      } else {
        setError(
          t("signInError", language),
        );
      }
    } finally {
      recordAuthTiming("login-submit-to-route-request", startedAt, outcome);
      setConnectionMessage("");
      setLoading(false);
    }
  }


  if (secureSession.isNative() && initializing) {
    return (
      <div className="auth-card" role="status" aria-live="polite">
        <h2>Restoring your secure session…</h2>
        <p>Connecting to CropGuard. Free hosting can take a minute to wake up.</p>
      </div>
    );
  }

  if (initialized && currentUser) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">
        {t("welcomeBack", language)}
      </span>

      <h2>
        {t("loginTitle", language)}
      </h2>

      <p>
        {t("loginIntro", language)}
      </p>

      {restoreNeedsNetwork ? (
        <div role="status" className="error-box">
          Your saved secure session is still on this device, but the server
          couldn't be reached. You can retry without entering your password.
          <button type="button" className="button secondary full"
            onClick={() => { void retryRestore(); }}>
            {t("restoreSession", language)}
          </button>
        </div>
      ) : null}

      <form
        onSubmit={
          handleSubmit
        }
      >
        <label>
          {t("email", language)}

          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(
                event.target.value,
              );
            }}
            autoComplete="email"
            placeholder="farmer@example.com"
            required
            autoFocus
          />
        </label>

        <label>
          {t("password", language)}

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(
                event.target.value,
              );
            }}
            autoComplete="current-password"
            minLength={8}
            maxLength={72}
            required
          />
        </label>

        {error ? (
          <div
            className="error-box"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {loading && connectionMessage ? (
          <p role="status" aria-live="polite" className="cg117-login-status">
            {connectionMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="button primary full"
          disabled={loading}
        >
          {loading
            ? t("signingIn", language)
            : t("signIn", language)}
        </button>
      </form>

      <GoogleSignIn />

      <p className="auth-footer">
        {t("newHere", language)}{" "}

        <Link
          to={routes.register}
        >
          {t("createAccount", language)}
        </Link>
      </p>
    </div>
  );
}

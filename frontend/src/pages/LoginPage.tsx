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


interface LoginLocationState {
  from?: string;
}


export default function LoginPage() {
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

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);
    // cropguard:mobile-login-message
    setConnectionMessage(
      "Connecting securely… Free hosting may take up to a minute to wake up."
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

      navigate(
        destination,
        {
          replace: true,
        },
      );
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
          "Unable to sign in. Please try again.",
        );
      }
    } finally {
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
        WELCOME BACK
      </span>

      <h2>
        Sign in to CropGuard
      </h2>

      <p>
        Access your farms,
        diagnoses and crop-health
        alerts.
      </p>

      {restoreNeedsNetwork ? (
        <div role="status" className="error-box">
          Your saved secure session is still on this device, but the server
          couldn't be reached. You can retry without entering your password.
          <button type="button" className="button secondary full"
            onClick={() => { void retryRestore(); }}>
            Retry saved session
          </button>
        </div>
      ) : null}

      <form
        onSubmit={
          handleSubmit
        }
      >
        <label>
          Email

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
          Password

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
          <p role="status" aria-live="polite" style={{ fontSize: "0.875rem", color: "#25616b" }}>
            {connectionMessage}
          </p>
        ) : null}

        <button
          type="submit"
          className="button primary full"
          disabled={loading}
        >
          {loading
            ? "Signing in…"
            : "Sign in"}
        </button>
      </form>

      <p className="auth-footer">
        New to CropGuard?{" "}

        <Link
          to={routes.register}
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
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

import {
  useBackendStatus,
} from "@/hooks/useBackendStatus";



interface LoginLocationState {
  from?: string;
}


export default function LoginPage() {
  const backendStatus = useBackendStatus();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const setSession =
    useAuthStore(
      (state) =>
        state.setSession,
    );

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
          caughtError.message,
        );
      } else {
        setError(
          "Unable to sign in. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
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

      <div className={`service-state service-state--${backendStatus}`}>
        <span />
        {backendStatus === "ready"
          ? "Cloud services ready"
          : backendStatus === "delayed"
            ? "Cloud service is taking longer than usual"
            : "Starting secure cloud services…"}
      </div>

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

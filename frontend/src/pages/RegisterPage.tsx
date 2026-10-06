import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
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



export default function RegisterPage() {
  const backendStatus = useBackendStatus();

  const navigate =
    useNavigate();

  const setSession =
    useAuthStore(
      (state) =>
        state.setSession,
    );

  const [
    fullName,
    setFullName,
  ] = useState("");

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
        await authApi.register({
          full_name:
            fullName.trim(),

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

      navigate(
        routes.dashboard,
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
          "Unable to create your account. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="auth-card">
      <span className="eyebrow">
        CREATE ACCOUNT
      </span>

      <h2>
        Join CropGuard
      </h2>

      <p>
        Create a farmer account
        to start monitoring your
        fields.
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
          Full name

          <input
            type="text"
            value={fullName}
            onChange={(event) => {
              setFullName(
                event.target.value,
              );
            }}
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
            autoFocus
          />
        </label>

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
            required
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
            autoComplete="new-password"
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
            ? "Creating account…"
            : "Create account"}
        </button>
      </form>

      <p className="auth-footer">
        Already registered?{" "}

        <Link
          to={routes.login}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { useCropGuardLanguage } from "@/features/preferences/preferences";
import { t } from "@/i18n";
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


export default function RegisterPage() {
  const language = useCropGuardLanguage();
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
          t("registerError", language),
        );
      }
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="auth-card">
      <span className="eyebrow">
        {t("createHeading", language)}
      </span>

      <h2>
        {t("registerTitle", language)}
      </h2>

      <p>
        {t("registerIntro", language)}
      </p>

      <form
        onSubmit={
          handleSubmit
        }
      >
        <label>
          {t("fullName", language)}

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
            required
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
            ? t("creatingAccount", language)
            : t("createAccount", language)}
        </button>
      </form>

      <GoogleSignIn />

      <p className="auth-footer">
        {t("registered", language)}{" "}

        <Link
          to={routes.login}
        >
          {t("signIn", language)}
        </Link>
      </p>
    </div>
  );
}

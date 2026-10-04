import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  KeyRound,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useMutation,
} from "@tanstack/react-query";

import {
  PageHeader,
} from "@/components/common/PageHeader";

import {
  useAuthStore,
} from "@/features/auth/store";

import {
  profileApi,
} from "@/features/profile/api/profileApi";

import {
  ApiClientError,
} from "@/services/apiError";

import "@/features/profile/profile.css";


export default function ProfilePage() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const updateUser =
    useAuthStore(
      (state) =>
        state.updateUser,
    );

  const [
    fullName,
    setFullName,
  ] = useState(
    user?.full_name
    ?? "",
  );

  const [
    profileSuccess,
    setProfileSuccess,
  ] = useState("");

  const [
    passwordForm,
    setPasswordForm,
  ] = useState({
    currentPassword:
      "",
    newPassword:
      "",
    confirmPassword:
      "",
  });

  const [
    passwordLocalError,
    setPasswordLocalError,
  ] = useState("");

  const [
    passwordSuccess,
    setPasswordSuccess,
  ] = useState("");


  useEffect(() => {
    setFullName(
      user?.full_name
      ?? "",
    );
  }, [
    user?.full_name,
  ]);


  const profileMutation =
    useMutation({
      mutationFn:
        profileApi.update,

      onSuccess:
        (updatedUser) => {
          updateUser(
            updatedUser,
          );

          setProfileSuccess(
            "Profile updated successfully.",
          );
        },
    });


  const passwordMutation =
    useMutation({
      mutationFn:
        profileApi.changePassword,

      onSuccess: () => {
        setPasswordForm({
          currentPassword:
            "",
          newPassword:
            "",
          confirmPassword:
            "",
        });

        setPasswordLocalError(
          "",
        );

        setPasswordSuccess(
          "Password changed successfully. Existing refresh sessions were revoked for security.",
        );
      },
    });


  function submitProfile(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setProfileSuccess(
      "",
    );

    profileMutation.mutate({
      full_name:
        fullName.trim(),
    });
  }


  function submitPassword(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setPasswordLocalError(
      "",
    );

    setPasswordSuccess(
      "",
    );

    if (
      passwordForm.newPassword
      !== passwordForm.confirmPassword
    ) {
      setPasswordLocalError(
        "New password and confirmation do not match.",
      );

      return;
    }

    passwordMutation.mutate({
      current_password:
        passwordForm.currentPassword,
      new_password:
        passwordForm.newPassword,
    });
  }


  const profileError =
    profileMutation.error
    instanceof ApiClientError
      ? profileMutation.error.message
      : profileMutation.isError
        ? "Unable to update profile."
        : "";


  const passwordError =
    passwordMutation.error
    instanceof ApiClientError
      ? passwordMutation.error.message
      : passwordMutation.isError
        ? "Unable to change password."
        : passwordLocalError;


  return (
    <div className="page">
      <PageHeader
        eyebrow="ACCOUNT"
        title="Profile"
        description="Manage your CropGuard account details and password."
      />

      <section className="profile-grid">
        <article className="panel profile-card">
          <UserRound
            size={28}
          />

          <h2>
            Account details
          </h2>

          <p>
            Your email and role are
            managed by CropGuard.
            You can update the name
            shown throughout the app.
          </p>

          <div className="profile-details">
            <div className="profile-detail">
              <span>
                Email
              </span>

              <strong>
                {user?.email
                  ?? "-"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>
                Role
              </span>

              <strong>
                {user?.role
                  .replaceAll(
                    "_",
                    " ",
                  )
                  ?? "-"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>
                Account
              </span>

              <strong>
                {user?.is_active
                  ? "Active"
                  : "Disabled"}
              </strong>
            </div>
          </div>

          <form
            className="profile-form"
            onSubmit={
              submitProfile
            }
          >
            <label>
              <span>
                Full name
              </span>

              <input
                value={
                  fullName
                }
                minLength={2}
                maxLength={120}
                required
                onChange={(event) => {
                  setFullName(
                    event.target.value,
                  );

                  setProfileSuccess(
                    "",
                  );
                }}
              />
            </label>

            {profileError ? (
              <div
                className="error-box"
                role="alert"
              >
                {profileError}
              </div>
            ) : null}

            {profileSuccess ? (
              <div className="success-box">
                {profileSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              className="button primary"
              disabled={
                profileMutation.isPending
              }
            >
              <Save
                size={16}
              />

              {profileMutation.isPending
                ? "Saving…"
                : "Save profile"}
            </button>
          </form>
        </article>

        <article className="panel profile-card">
          <KeyRound
            size={28}
          />

          <h2>
            Change password
          </h2>

          <p>
            Use at least 8 characters.
            Changing your password
            revokes active refresh
            sessions.
          </p>

          <form
            className="profile-form"
            onSubmit={
              submitPassword
            }
          >
            <label>
              <span>
                Current password
              </span>

              <input
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="current-password"
                required
                value={
                  passwordForm
                    .currentPassword
                }
                onChange={(event) => {
                  setPasswordForm(
                    (current) => ({
                      ...current,
                      currentPassword:
                        event.target.value,
                    }),
                  );

                  setPasswordLocalError(
                    "",
                  );

                  setPasswordSuccess(
                    "",
                  );
                }}
              />
            </label>

            <label>
              <span>
                New password
              </span>

              <input
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                required
                value={
                  passwordForm
                    .newPassword
                }
                onChange={(event) => {
                  setPasswordForm(
                    (current) => ({
                      ...current,
                      newPassword:
                        event.target.value,
                    }),
                  );

                  setPasswordLocalError(
                    "",
                  );
                }}
              />
            </label>

            <label>
              <span>
                Confirm new password
              </span>

              <input
                type="password"
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                required
                value={
                  passwordForm
                    .confirmPassword
                }
                onChange={(event) => {
                  setPasswordForm(
                    (current) => ({
                      ...current,
                      confirmPassword:
                        event.target.value,
                    }),
                  );

                  setPasswordLocalError(
                    "",
                  );
                }}
              />
            </label>

            {passwordError ? (
              <div
                className="error-box"
                role="alert"
              >
                {passwordError}
              </div>
            ) : null}

            {passwordSuccess ? (
              <div className="success-box">
                {passwordSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              className="button secondary"
              disabled={
                passwordMutation.isPending
              }
            >
              <ShieldCheck
                size={16}
              />

              {passwordMutation.isPending
                ? "Updating…"
                : "Update password"}
            </button>

            <div className="profile-note">
              Your current access token
              remains valid until it
              expires. Sign out and back
              in after changing your
              password if you want a fresh
              session immediately.
            </div>
          </form>
        </article>
      </section>
    </div>
  );
}

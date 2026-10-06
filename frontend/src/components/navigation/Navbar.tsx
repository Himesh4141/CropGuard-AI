import {
  Activity,
  LogOut,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  routes,
} from "@/config/routes";

import {
  useAuthStore,
} from "@/features/auth/store";


export function Navbar() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const logout =
    useAuthStore(
      (state) =>
        state.logout,
    );

  const navigate =
    useNavigate();


  function handleLogout(): void {
    /*
     * Local logout happens immediately.
     * Server refresh-session revocation continues in the background.
     */
    void logout();

    navigate(
      routes.login,
      {
        replace:
          true,
      },
    );
  }


  return (
    <header className="topbar">
      <div className="topbar-context">
        <span className="topbar-context-badge">
          <Activity size={16} />
        </span>

        <div>
          <strong>
            CropGuard workspace
          </strong>

          <span>
            Live field intelligence
          </span>
        </div>
      </div>

      <div className="userbox">
        <Link
          to={routes.profile}
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "9px",

            color:
              "inherit",

            textDecoration:
              "none",
          }}
          aria-label="Open profile"
        >
          <div className="avatar">
            {user?.full_name
              .slice(
                0,
                1,
              )
              .toUpperCase()
              ?? "U"}
          </div>

          <div>
            <strong>
              {user?.full_name}
            </strong>

            <small>
              {user?.role
                .replaceAll(
                  "_",
                  " ",
                )}
            </small>
          </div>
        </Link>

        <button
          type="button"
          className="icon-button"
          onClick={
            handleLogout
          }
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut
            size={17}
          />
        </button>
      </div>
    </header>
  );
}

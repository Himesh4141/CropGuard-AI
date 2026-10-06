import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { routes } from "@/config/routes";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store";

export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const clear = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clear();
      navigate(routes.login, { replace: true });
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-context">
        <span>Smart Crop Health Platform</span>
        <span className="topbar-live">Live monitoring</span>
      </div>

      <div className="userbox">
        <Link
          to={routes.profile}
          className="userbox-link"
          aria-label="Open profile"
        >
          <div className="avatar">
            {user?.full_name.slice(0, 1).toUpperCase() ?? "U"}
          </div>
          <div>
            <strong>{user?.full_name}</strong>
            <small>{user?.role.replaceAll("_", " ")}</small>
          </div>
        </Link>

        <button
          type="button"
          className="icon-button"
          onClick={logout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}

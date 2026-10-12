import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import approvedIcon from "@/assets/images/cropguard-approved-icon.png";
import { applyPreferences, loadAvatar, loadPreferences } from "@/features/profile/localPreferences";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { routes } from "@/config/routes";
import { useAuthStore } from "@/features/auth/store";

/** Keep the CropGuard name visible on every screen, including small Android WebViews. */
export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.id;
  const [avatar, setAvatar] = useState<string | null>(null);
  useEffect(() => {
    function syncProfile() {
      setAvatar(userId ? loadAvatar(userId) : null);
      if (userId) applyPreferences(loadPreferences(userId));
    }
    syncProfile();
    window.addEventListener("cropguard:profile-preferences", syncProfile);
    return () => window.removeEventListener("cropguard:profile-preferences", syncProfile);
  }, [userId]);

  const isHomePlanters = location.pathname === routes.homePlanters;
  const context = isHomePlanters
    ? "Home Planters"
    : user?.role === "extension_officer"
      ? "Extension Officer Workspace"
      : user?.role === "admin"
        ? "Administration"
        : "Field intelligence";

  function handleLogout(): void {
    // Clear the client session immediately; remote refresh-token revocation is asynchronous.
    void logout();
    void navigate(routes.login, { replace: true });
  }

  return (
    <header className="topbar">
      <div className="topbar-context" aria-label={`CropGuard · ${context}`}>
        <span className="topbar-context-badge" aria-hidden="true">
          <img className="cropguard-brand-image" src={approvedIcon} alt="" />
        </span>
        <div className="topbar-brand-copy">
          <strong>CropGuard</strong>
          <span>{context}</span>
        </div>
      </div>

      <div className="userbox">
        <Link
          className="topbar-profile-link"
          to={routes.profile}
          aria-label="Open profile"
        >
          <div className="avatar" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"inherit"}} /> : (user?.full_name?.slice(0, 1).toUpperCase() ?? "U")}
          </div>
          <div className="topbar-profile-copy">
            <strong>{user?.full_name}</strong>
            <small>{user?.role?.replaceAll("_", " ")}</small>
          </div>
        </Link>
        <button
          type="button"
          className="icon-button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={17} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

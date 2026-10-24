import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { applyPreferences, loadAvatar, loadPreferences } from "@/features/profile/localPreferences";
import { Link, useLocation } from "react-router-dom";
import { routes } from "@/config/routes";
import { cgText, useCropGuardLanguage } from "@/features/preferences/preferences";
import { useAuthStore } from "@/features/auth/store";

/** Keep the CropGuard name visible on every screen, including small Android WebViews. */
export function Navbar() {
  const user = useAuthStore((state) => state.user);
  const language = useCropGuardLanguage();
  const location = useLocation();
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


  return (
    <header className="topbar">
      <div className="topbar-context" aria-label={`CropGuard · ${context}`}>
        <span className="topbar-context-badge" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}brand/cropguard-unified-v115-64.png`} width={30} height={30} alt="" style={{width:"100%",height:"100%",objectFit:"contain",background:"white",borderRadius:"12px"}} /></span>
        <div className="topbar-brand-copy">
          <strong>CropGuard</strong>
          <span>{cgText(context, language)}</span>
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
          onClick={() => window.dispatchEvent(new Event("cropguard:open-settings"))}
          aria-label="Open settings"
          title="Open settings"
        >
          <Settings2 size={17} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

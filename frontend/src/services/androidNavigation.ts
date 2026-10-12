import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { router } from "@/app/router";
import { routes } from "@/config/routes";
import { useAuthStore } from "@/features/auth/store";
import { AndroidBackTrail } from "@/services/androidBackTrail";

/** Attach one native Android Back listener per application boot. */
let installed = false;

function currentRoleHome(): string {
  const role = useAuthStore.getState().user?.role;
  if (role === "admin") return routes.admin;
  if (role === "extension_officer") return routes.officer;
  if (role === "farmer") return routes.dashboard;
  return routes.login;
}

function sessionIdentity(): string | null {
  const user = useAuthStore.getState().user;
  return user ? `${user.role}:${user.id}` : null;
}

export function installAndroidNavigation(): void {
  if (Capacitor.getPlatform() !== "android" || installed) return;
  installed = true;

  const trail = new AndroidBackTrail();
  trail.observe(router.state.location.pathname, sessionIdentity());

  router.subscribe((state) => {
    trail.observe(state.location.pathname, sessionIdentity());
  });

  void App.addListener("backButton", () => {
    const location = router.state.location.pathname;
    const roleHome = currentRoleHome();
    const destination = trail.previous(location, sessionIdentity(), roleHome);
    if (destination && destination !== location) {
      // Replace instead of adding new WebView history entries on each Back.
      void router.navigate(destination, { replace: true });
    }
    // At the user's role home, Back deliberately does not sign out or exit.
  });
}

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { router } from "@/app/router";
import { routes } from "@/config/routes";

export function installAndroidNavigation(): void {
  if (Capacitor.getPlatform() !== "android") return;

  void App.addListener("backButton", () => {
    const path = router.state.location.pathname;
    if (path === routes.home) {
      // At the root, never close the app unexpectedly.
      return;
    }
    if (path === routes.dashboard) {
      // The dashboard is the authenticated home screen.
      return;
    }
    if (path === routes.login || path === routes.register) {
      void router.navigate(routes.home);
      return;
    }
    void router.navigate(routes.dashboard);
  });
}

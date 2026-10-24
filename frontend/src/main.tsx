import "@/features/preferences/cropguardLocaleBridge";
import "@/services/backendWarmup";
import {
  initializeNativeNotifications,
} from "@/services/nativeNotifications";
import { installAndroidNavigation } from "@/services/androidNavigation";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { AppProviders } from "@/app/providers";
import "@/styles/variables.css";
import "@/styles/globals.css";
import "@/styles/responsive.css";
import "@/styles/mobile-polish.css";
import "@/styles/cropguard-mobile-final.css";
import "@/styles/cropguard-ux-v116.css";
import "@/styles/cropguard-auth-v117.css";
import "@/styles/cropguard-contrast-v118.css";
import "@/styles/cropguard-google.css";
import "@/styles/cropguard-v121-visual.css";
import "@/styles/cropguard-v123-mobile-layout.css";
import "@/styles/cropguard-v125-chrome.css";
import "@/styles/cropguard-v125-sidebar-contrast.css";
void initializeNativeNotifications();
installAndroidNavigation();

const root=document.getElementById("root");
if(!root) throw new Error("Root element not found");
createRoot(root).render(<StrictMode><AppProviders><App/></AppProviders></StrictMode>);

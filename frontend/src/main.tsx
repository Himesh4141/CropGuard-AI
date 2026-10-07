import "@/services/backendWarmup";
import {
  initializeNativeNotifications,
} from "@/services/nativeNotifications";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import { AppProviders } from "@/app/providers";
import "@/styles/variables.css";
import "@/styles/globals.css";
import "@/styles/responsive.css";
void initializeNativeNotifications();

const root=document.getElementById("root");
if(!root) throw new Error("Root element not found");
createRoot(root).render(<StrictMode><AppProviders><App/></AppProviders></StrictMode>);

import { registerPlugin } from "@capacitor/core";
import { secureSession } from "@/services/secureSession";
import { env } from "@/config/env";

// The Capacitor-native Java plugin never returns Google OAuth access tokens.
// Only the signed Google ID token is sent to our API for independent verification.
interface NativeGoogle { signIn(options: { webClientId: string }): Promise<{ idToken: string }> }
const nativeGoogle = registerPlugin<NativeGoogle>("CropGuardGoogle");

type CredentialResponse = { credential?: string };
type GIS = {
  initialize(options: { client_id: string; callback: (result: CredentialResponse) => void; auto_select: boolean }): void;
  renderButton(node: HTMLElement, options: Record<string, unknown>): void;
  cancel(): void;
};
declare global { interface Window { google?: { accounts: { id: GIS } } } }
let scriptPromise: Promise<void> | null = null;
function loadGIS(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.accounts?.id ? resolve() : reject(new Error("Google sign-in could not start"));
    script.onerror = () => reject(new Error("Cannot load Google sign-in. Check your internet connection."));
    document.head.append(script);
  }).catch(error => { scriptPromise = null; throw error; });
  return scriptPromise;
}
export function googleEnabled(): boolean {
  return env.GOOGLE_SIGN_IN_ENABLED && Boolean(env.GOOGLE_WEB_CLIENT_ID);
}
export function nativeGoogleAvailable(): boolean { return secureSession.isNative(); }
export async function nativeGoogleIdToken(): Promise<string> {
  if (!googleEnabled()) throw new Error("Google sign-in requires the new backend release.");
  const result = await nativeGoogle.signIn({ webClientId: env.GOOGLE_WEB_CLIENT_ID });
  if (!result.idToken) throw new Error("Google sign-in did not return an ID token");
  return result.idToken;
}
export async function renderGoogleWebButton(
  element: HTMLElement,
  onToken: (idToken: string) => void,
): Promise<void> {
  if (!googleEnabled()) throw new Error("Google sign-in requires the new backend release.");
  await loadGIS();
  const gis = window.google?.accounts.id;
  if (!gis) throw new Error("Google sign-in is not available");
  gis.initialize({ client_id: env.GOOGLE_WEB_CLIENT_ID, callback: response => {
    if (response.credential) onToken(response.credential);
  }, auto_select: false });
  gis.renderButton(element, { theme: "outline", size: "large", width: 280, text: "continue_with", shape: "pill" });
}

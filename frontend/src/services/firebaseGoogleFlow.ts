import { Capacitor, registerPlugin } from "@capacitor/core";
import { env } from "@/config/env";
import {
  firebaseNativeGoogleLogin,
  firebaseWebGoogleLogin,
} from "@/services/firebaseIdentityBridge";

interface NativeGoogle {
  signIn(options: { webClientId: string }): Promise<{ idToken: string }>;
}

const nativeGoogle = registerPlugin<NativeGoogle>("CropGuardGoogle");

// Must stay false unless the matching Render backend is deployed and enabled.
export function firebaseAuthPilotEnabled(): boolean {
  return import.meta.env.VITE_CROPGUARD_FIREBASE_AUTH === "true";
}

// The native plugin obtains a Google ID token, then Firebase exchanges it for
// a Firebase ID token. Only the Firebase ID token goes to /auth/mobile/firebase.
export async function firebaseGoogleIdToken(): Promise<string> {
  if (!firebaseAuthPilotEnabled()) {
    throw new Error("Firebase sign-in is not enabled");
  }
  if (!Capacitor.isNativePlatform()) {
    return firebaseWebGoogleLogin();
  }
  if (!env.GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google Web client ID is not configured");
  }
  const result = await nativeGoogle.signIn({ webClientId: env.GOOGLE_WEB_CLIENT_ID });
  if (!result.idToken) {
    throw new Error("Google ID token was not received");
  }
  return firebaseNativeGoogleLogin(result.idToken);
}

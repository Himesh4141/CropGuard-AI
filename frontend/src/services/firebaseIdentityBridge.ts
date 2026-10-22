import { Capacitor } from '@capacitor/core'
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { getCropGuardFirebaseAuth } from './firebaseCompat'

// Web only: opens Google's account selection.
export async function firebaseWebGoogleLogin(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    throw new Error('Use native Google authentication on Android')
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const result = await signInWithPopup(
    getCropGuardFirebaseAuth(),
    provider,
  )

  return result.user.getIdToken()
}

// Android: receives a Google ID token from the existing native plugin.
export async function firebaseNativeGoogleLogin(
  googleIdToken: string,
): Promise<string> {
  if (!googleIdToken.trim()) {
    throw new Error('Google ID token is required')
  }

  const credential = GoogleAuthProvider.credential(googleIdToken)
  const result = await signInWithCredential(
    getCropGuardFirebaseAuth(),
    credential,
  )

  return result.user.getIdToken()
}

// Only for Firebase-enrolled accounts.
// Existing CropGuard password accounts must retain legacy login
// until a secure account migration or linking flow is implemented.
export async function firebasePasswordLogin(
  email: string,
  password: string,
): Promise<string> {
  const result = await signInWithEmailAndPassword(
    getCropGuardFirebaseAuth(),
    email,
    password,
  )

  return result.user.getIdToken()
}
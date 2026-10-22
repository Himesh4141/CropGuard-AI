import { getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const config = {
  apiKey: 'AIzaSyBgOS6uCAl1GuLemxtBanPPCe8Sa4-BV6E',
  authDomain: 'cropguard-ai-512310.firebaseapp.com',
  projectId: 'cropguard-ai-512310',
  messagingSenderId: '520759216755',
  appId: '1:520759216755:web:6cc2719f249d7387527806',
}

export function getCropGuardFirebaseAuth() {
  const name = 'cropguard-auth-compat'
  const app =
    getApps().find((existing) => existing.name === name) ??
    initializeApp(config, name)

  return getAuth(app)
}
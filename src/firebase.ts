import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const requiredEnv = (name: string) => {
  const value = import.meta.env[name] as string | undefined;
  if (!value) throw new Error(`Missing Firebase environment variable: ${name}`);
  return value;
};

const firebaseConfig = {
  apiKey: requiredEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requiredEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: requiredEnv('VITE_FIREBASE_DATABASE_URL'),
  projectId: requiredEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: requiredEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requiredEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requiredEnv('VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined;
if (appCheckSiteKey && typeof window !== 'undefined') {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(firebaseApp);
export const db = getDatabase(firebaseApp);
export const storage = getStorage(firebaseApp);
export const firebaseDatabaseUrl = firebaseConfig.databaseURL;

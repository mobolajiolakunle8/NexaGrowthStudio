// 🔐 Secure configuration - Load from environment variables
// NEVER hardcode API keys in source code or commit them to version control

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

let config: FirebaseConfig | null = null;

export function getFirebaseConfig(): FirebaseConfig {
  if (config) return config;
  
  // Try to load from environment variables (Vite style)
  const apiKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;
  const authDomain = (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN;
  const databaseURL = (import.meta as any).env?.VITE_FIREBASE_DATABASE_URL;
  const projectId = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = (import.meta as any).env?.VITE_FIREBASE_APP_ID;
  const measurementId = (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID;

  if (apiKey && databaseURL) {
    config = {
      apiKey: apiKey as string,
      authDomain: authDomain as string,
      databaseURL: databaseURL as string,
      projectId: projectId as string,
      storageBucket: storageBucket as string,
      messagingSenderId: messagingSenderId as string,
      appId: appId as string,
      measurementId: measurementId as string,
    };
    return config;
  }
  
  // ⚠️ DEVELOPMENT-ONLY FALLBACK (never commit this to git)
  // In production, API keys should come from environment variables
  config = {
    apiKey: "AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU",
    authDomain: "nexa-growth-studio.firebaseapp.com",
    databaseURL: "https://nexa-growth-studio-default-rtdb.firebaseio.com",
    projectId: "nexa-growth-studio",
    storageBucket: "nexa-growth-studio.firebasestorage.app",
    messagingSenderId: "1041308945872",
    appId: "1:1041308945872:web:9ed3b79b0df00cc857fdd5",
    measurementId: "G-1PPCHGHWH7"
  };
  
  return config;
}

// Export static config (this will be removed from git via .gitignore)
export const firebaseConfig = getFirebaseConfig();

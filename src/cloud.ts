// 🔐 Firebase Cloud Sync Module — Local + Cloud with proper imports

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue } from 'firebase/database';
import type { Book, Lead } from './types';

// ─── Local storage keys ─────────────────────────────────────
const LS_BOOKS = 'nexa_books_v1';
const LS_LEADS = 'nexa_leads_v1';

// ─── Read/write storage (safe in private mode) ────────────────
export function readLocal(): { books: Book[]; leads: Lead[] } {
  try {
    const b = localStorage.getItem(LS_BOOKS);
    if (b) return { books: JSON.parse(b) as Book[], leads: [] };
    return { books: [], leads: [] };
  } catch { return { books: [], leads: [] }; }
}

export function writeLocal(books: Book[], leads: Lead[]): void {
  try { localStorage.setItem(LS_BOOKS, JSON.stringify(books)); } catch { /* */ }
  try { localStorage.setItem(LS_LEADS, JSON.stringify(leads)); } catch { /* */ }
}

// ─── Settings (localStorage helpers for MegaAdmin) ─────────────────────────
export function getEffectiveDbUrl(): string {
  try { return localStorage.getItem('nexa_cloud_db_url') || ''; } catch { return ''; }
}

export function setDbUrl(url: string): void {
  try { localStorage.setItem('nexa_cloud_db_url', url); } catch { /* */ }
}

export function isSyncEnabled(): boolean {
  try { return localStorage.getItem('nexa_cloud_sync_enabled') === 'true'; } catch { return false; }
}

export function setSyncEnabled(enabled: boolean): void {
  try { localStorage.setItem('nexa_cloud_sync_enabled', String(enabled)); } catch { /* */ }
}

export function getLastSyncTime(): string | null {
  try { return localStorage.getItem('nexa_cloud_last_sync'); } catch { return null; }
}

/** Legacy alias for MegaAdmin */
export function getLastSync(): string | null {
  return getLastSyncTime();
}

// ─── Firebase Configuration ────────────────────────────────────
// In client-side single-page applications (SPAs), Firebase API keys are public by design
// and identify your Firebase project to Google Cloud. Database rules secure the actual data.
export const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_API_KEY as string) || "AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU",
  authDomain: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || "nexa-growth-studio.firebaseapp.com",
  databaseURL: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_DATABASE_URL as string) || "https://nexa-growth-studio-default-rtdb.firebaseio.com",
  projectId: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_PROJECT_ID as string) || "nexa-growth-studio",
  storageBucket: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || "nexa-growth-studio.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "1041308945872",
  appId: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_APP_ID as string) || "1:1041308945872:web:9ed3b79b0df00cc857fdd5",
  measurementId: (typeof import.meta !== 'undefined' && (import.meta as Record<string, any>)?.env?.VITE_FIREBASE_MEASUREMENT_ID as string) || "G-1PPCHGHWH7"
};

// Safe initialization that avoids duplicate app error in Hot Module Reloading
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);
const nexaRef = ref(db, 'nexa');

// ─── Firebase Operations ─────────────────────────────────────

export async function fetchFromCloud(): Promise<{ books: Book[]; leads: Lead[] } | null> {
  try {
    const snapshot = await get(nexaRef);
    if (!snapshot.exists()) return { books: [], leads: [] };
    const data = snapshot.val() as Record<string, unknown> | null;
    return { books: (data?.books ?? []) as Book[], leads: (data?.leads ?? []) as Lead[] };
  } catch (e) {
    console.error('fetchFromCloud failed:', e);
    return null;
  }
}

/** Legacy alias — supports both pullFromCloud() and pullFromCloud(url) calls */
export async function pullFromCloud(databaseUrl?: string): Promise<{ books: Book[]; leads: Lead[] } | null> {
  if (databaseUrl) return fetchFromCloudUrl(databaseUrl);
  return fetchFromCloud();
}

export async function fetchFromCloudUrl(databaseUrl: string): Promise<{ books: Book[]; leads: Lead[] } | null> {
  try {
    const appName = `custom_${encodeURIComponent(databaseUrl)}`;
    const customApp = getApps().some(a => a.name === appName) 
      ? getApp(appName)
      : initializeApp({ ...firebaseConfig, databaseURL: databaseUrl }, appName);
    const customDb = getDatabase(customApp);
    const snapshot = await get(ref(customDb, 'nexa'));
    if (!snapshot.exists()) return { books: [], leads: [] };
    const data = snapshot.val() as Record<string, unknown> | null;
    return { books: (data?.books ?? []) as Book[], leads: (data?.leads ?? []) as Lead[] };
  } catch (e) {
    console.error('fetchFromCloudUrl failed:', e);
    return null;
  }
}

export async function pushToCloud(books: Book[], leads: Lead[]): Promise<boolean> {
  try {
    await set(nexaRef, { books, leads, updatedAt: new Date().toISOString() });
    writeLocal(books, leads);
    try { localStorage.setItem('nexa_cloud_last_sync', new Date().toISOString()); } catch {}
    return true;
  } catch (e) {
    console.error('pushToCloud failed:', e);
    return false;
  }
}

export async function pushToCloudUrl(databaseUrl: string, books: Book[], leads: Lead[]): Promise<boolean> {
  try {
    const appName = `custom_${encodeURIComponent(databaseUrl)}`;
    const customApp = getApps().some(a => a.name === appName) 
      ? getApp(appName)
      : initializeApp({ ...firebaseConfig, databaseURL: databaseUrl }, appName);
    const customDb = getDatabase(customApp);
    await set(ref(customDb, 'nexa'), { books, leads, updatedAt: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error('pushToCloudUrl failed:', e);
    return false;
  }
}

export async function pushLocalToCloud(): Promise<boolean> {
  const { books, leads } = readLocal();
  return pushToCloud(books, leads);
}

// ─── Live Sync ──────────────────────────────────────────────────
let liveUnsub: (() => void) | null = null;
let liveCb: ((books: Book[], leads: Lead[]) => void) | null = null;

export function startLiveSync(callback: (books: Book[], leads: Lead[]) => void): () => void {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  liveCb = callback;
  try {
    liveUnsub = onValue(
      nexaRef,
      (snap) => {
        try {
          if (!snap.exists()) { 
            if (liveCb) liveCb([], []); 
            return; 
          }
          const d = snap.val() as Record<string, unknown> | null;
          const books = (Array.isArray(d?.books) ? d?.books : []) as Book[];
          const leads = (Array.isArray(d?.leads) ? d?.leads : []) as Lead[];
          try { localStorage.setItem('nexa_cloud_last_sync', new Date().toISOString()); } catch {}
          if (liveCb) liveCb(books, leads);
        } catch (err) {
          console.warn('Live sync payload processing warning:', err);
        }
      },
      (error) => {
        console.warn('Live sync onValue error (safe fallback to local data):', error);
      }
    );
  } catch (err) {
    console.warn('startLiveSync listener error:', err);
  }
  return () => { if (liveUnsub) { liveUnsub(); liveUnsub = null; } liveCb = null; };
}

export function stopLiveSync(): void {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  liveCb = null;
}

export function isSyncActiveFn(): boolean {
  return !!liveUnsub;
}

// ─── Connection Test ─────────────────────────────────────────────
export async function testConnection(databaseUrl?: string): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    if (databaseUrl) {
      const appName = `custom_test_${Date.now()}`;
      const customApp = initializeApp({ ...firebaseConfig, databaseURL: databaseUrl }, appName);
      const customDb = getDatabase(customApp);
      await get(ref(customDb, 'nexa'));
      return { ok: true, message: 'Connected to Firebase (custom URL).' };
    }
    await get(nexaRef);
    return { ok: true, message: 'Connected to Firebase Realtime Database.' };
  } catch (e) {
    return {
      ok: false,
      message: `Connection failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ─── Debounced Push ────────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | null = null;

export function schedulePush(delayMs = 500): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    try { await pushLocalToCloud(); } catch (e) { console.error('schedulePush error:', e); }
  }, delayMs);
}

export function cancelScheduledPush(): void {
  if (timer) { clearTimeout(timer); timer = null; }
}

// ─── Cleanup ────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopLiveSync();
    cancelScheduledPush();
  });
}

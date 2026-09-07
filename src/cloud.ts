import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';
import type { Book, Lead } from './types';
import { BOOKS_STORAGE_KEY, LEADS_STORAGE_KEY } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU",
  authDomain: "nexa-growth-studio.firebaseapp.com",
  databaseURL: "https://nexa-growth-studio-default-rtdb.firebaseio.com",
  projectId: "nexa-growth-studio",
  storageBucket: "nexa-growth-studio.firebasestorage.app",
  messagingSenderId: "1041308945872",
  appId: "1:1041308945872:web:9ed3b79b0df00cc857fdd5",
  measurementId: "G-1PPCHGHWH7"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const NEXA_REF = ref(db, 'nexa');

export interface CloudPayload {
  books: Book[];
  leads: Lead[];
}

// ── Local browser storage ──────────────────────────────────
export function readLocal(): { books: Book[]; leads: Lead[] } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  try { const b = localStorage.getItem(BOOKS_STORAGE_KEY); if (b) books = JSON.parse(b); } catch {}
  try { const l = localStorage.getItem(LEADS_STORAGE_KEY); if (l) leads = JSON.parse(l); } catch {}
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch {}
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch {}
}

// ── One-time fetch from Firebase ───────────────────────────
export async function fetchFromCloud(): Promise<CloudPayload | null> {
  try {
    const snap = await get(NEXA_REF);
    if (!snap.exists()) return { books: [], leads: [] };
    const data = snap.val();
    return {
      books: Array.isArray(data.books) ? data.books : [],
      leads: Array.isArray(data.leads) ? data.leads : [],
    };
  } catch { return null; }
}

// ── Push local data to Firebase ────────────────────────────
export async function pushToCloud(books: Book[], leads: Lead[]): Promise<boolean> {
  try {
    const payload: CloudPayload = { books, leads };
    await set(NEXA_REF, payload);
    return true;
  } catch { return false; }
}

// ── Live sync ──────────────────────────────────────────────
let liveUnsubscribe: (() => void) | null = null;
let liveCallback: ((books: Book[], leads: Lead[]) => void) | null = null;
let isSyncActive = false;
let lastSyncTime: string | null = null;

export function startLiveSync(callback: (books: Book[], leads: Lead[]) => void): void {
  stopLiveSync();
  liveCallback = callback;
  liveUnsubscribe = onValue(NEXA_REF, (snap) => {
    if (!snap.exists()) {
      if (liveCallback) liveCallback([], []);
      return;
    }
    const data = snap.val();
    const books = Array.isArray(data.books) ? data.books : [];
    const leads = Array.isArray(data.leads) ? data.leads : [];
    isSyncActive = true;
    lastSyncTime = new Date().toISOString();
    if (liveCallback) liveCallback(books, leads);
  });
  isSyncActive = true;
}

export function stopLiveSync(): void {
  if (liveUnsubscribe) { liveUnsubscribe(); liveUnsubscribe = null; }
  liveCallback = null;
  isSyncActive = false;
}

export function isSyncActiveFn(): boolean { return isSyncActive; }
export function getLastSyncTime(): string | null { return lastSyncTime; }

// ── Pull from cloud ─────────────────────────────────────────
export async function pullFromCloud(): Promise<CloudPayload | null> {
  return fetchFromCloud();
}

// ── Connection test ────────────────────────────────────────
export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await get(NEXA_REF);
    return { ok: true, message: 'Connected to Firebase Realtime Database.' };
  } catch (e) {
    return { ok: false, message: `Connection failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── Helper functions for settings UI ──────────────────────
const DB_URL_KEY = 'nexa_db_url';
const SYNC_ENABLED_KEY = 'nexa_sync_enabled';

export function getEffectiveDbUrl(): string {
  try {
    return localStorage.getItem(DB_URL_KEY) || 'https://nexa-growth-studio-default-rtdb.firebaseio.com';
  } catch { return 'https://nexa-growth-studio-default-rtdb.firebaseio.com'; }
}

export function setDbUrl(url: string): void {
  try { localStorage.setItem(DB_URL_KEY, url); } catch {}
}

export function isSyncEnabled(): boolean {
  try { return localStorage.getItem(SYNC_ENABLED_KEY) === 'true'; } catch { return false; }
}

export function setSyncEnabled(on: boolean): void {
  try { localStorage.setItem(SYNC_ENABLED_KEY, String(on)); } catch {}
}

export function getLastSync(): string | null {
  return getLastSyncTime();
}

// ── Cleanup on app unload ──────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => stopLiveSync());
}

// ── Debounced push helper ───────────────────────────────────
let pushTimeout: ReturnType<typeof setTimeout> | null = null;
export function schedulePush(delayMs = 1500): void {
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    pushToCloud(readLocal().books, readLocal().leads);
    pushTimeout = null;
  }, delayMs);
}

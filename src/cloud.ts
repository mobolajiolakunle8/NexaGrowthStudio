// 🔐 Firebase Cloud Sync Module — Local + Full Automatic Cross-Browser Sync

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue, update } from 'firebase/database';
import type { Book, Lead } from './types';

// ─── Local storage keys ─────────────────────────────────────
const LS_BOOKS = 'nexa_books_v1';
const LS_LEADS = 'nexa_leads_v1';
const LS_META = 'nexa_cloud_meta';

// Random client identifier so our own echo can be distinguished from remote changes
const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Internal flag to suppress the local echo of a cloud write we just performed
let suppressNextLive = false;
let pendingSuppressTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Read/write storage (safe in private mode) ────────────────
export function readLocal(): { books: Book[]; leads: Lead[] } {
  try {
    const b = localStorage.getItem(LS_BOOKS);
    return { books: b ? JSON.parse(b) as Book[] : [], leads: [] };
  } catch { return { books: [], leads: [] }; }
}

export function writeLocal(books: Book[], leads: Lead[]): void {
  try { localStorage.setItem(LS_BOOKS, JSON.stringify(books)); } catch { /* */ }
  try { localStorage.setItem(LS_LEADS, JSON.stringify(leads)); } catch { /* */ }
  try { localStorage.setItem(LS_META, JSON.stringify({ at: new Date().toISOString(), client: clientId })); } catch { /* */ }
}

// ─── Settings (localStorage helpers for MegaAdmin) ─────────────────────────
export function getEffectiveDbUrl(): string {
  try { return localStorage.getItem('nexa_cloud_db_url') || ''; } catch { return ''; }
}

export function setDbUrl(url: string): void {
  try { localStorage.setItem('nexa_cloud_db_url', url); } catch { /* */ }
}

export function isSyncEnabled(): boolean {
  try { return localStorage.getItem('nexa_cloud_sync_enabled') !== 'false'; } catch { return true; }
}

export function setSyncEnabled(enabled: boolean): void {
  try { localStorage.setItem('nexa_cloud_sync_enabled', String(enabled)); } catch { /* */ }
}

export function getLastSync(): string | null {
  try {
    const raw = localStorage.getItem(LS_META);
    if (!raw) return null;
    const meta = JSON.parse(raw) as { at?: string };
    return meta.at || null;
  } catch { return null; }
}

export function getLastSyncTime(): string | null {
  return getLastSync();
}

// ─── Firebase Configuration ────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nexa-growth-studio.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://nexa-growth-studio-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nexa-growth-studio",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nexa-growth-studio.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1041308945872",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1041308945872:web:9ed3b79b0df00cc857fdd5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-1PPCHGHWH7"
};

// Safe initialization to avoid duplicate app errors
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);
const nexaRef = ref(db, 'nexa');
const booksRef = ref(db, 'nexa/books');
const leadsRef = ref(db, 'nexa/leads');

// ─── Data validation helpers (prevent garbage writes) ────────
function normalizeBookList(value: unknown): Book[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Book => {
    const b = item as Partial<Book> | null;
    return !!b && typeof b.id === 'string' && typeof b.title === 'string' && Array.isArray(b.whatsInside);
  });
}

function normalizeLeadList(value: unknown): Lead[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Lead => {
    const l = item as Partial<Lead> | null;
    return !!l && typeof l.id === 'string' && typeof l.email === 'string';
  });
}

// ─── Firebase single-read ─────────────────────────────────────
export async function fetchFromCloud(): Promise<{ books: Book[]; leads: Lead[] } | null> {
  try {
    const snapshot = await get(nexaRef);
    if (!snapshot.exists()) return { books: [], leads: [] };
    const d = snapshot.val() as Record<string, unknown> | null;
    return { books: normalizeBookList(d?.books), leads: normalizeLeadList(d?.leads) };
  } catch (e) {
    console.error('fetchFromCloud failed:', e);
    return null;
  }
}

/** Legacy alias — supports pullFromCloud() and pullFromCloud(url) */
export async function pullFromCloud(_databaseUrl?: string): Promise<{ books: Book[]; leads: Lead[] } | null> {
  return fetchFromCloud();
}

// ─── Automatic write: saves changes immediately to all browsers ──
let autoTimer: ReturnType<typeof setTimeout> | null = null;

export function autoSyncBooks(books: Book[], leads: Lead[] = []): Promise<boolean> {
  if (autoTimer) clearTimeout(autoTimer);
  return new Promise<boolean>((resolve) => {
    autoTimer = setTimeout(async () => {
      try {
        suppressNextLive = true;
        if (pendingSuppressTimer) clearTimeout(pendingSuppressTimer);
        pendingSuppressTimer = setTimeout(() => { suppressNextLive = false; }, 4000);

        // Write books to their own node so readers who only need books pay less bandwidth
        await set(booksRef, { books: normalizeBookList(books) });
        if (leads.length > 0) {
          await set(leadsRef, { leads: normalizeLeadList(leads) });
        }
        await update(nexaRef, { updatedAt: new Date().toISOString(), client: clientId });
        writeLocal(normalizeBookList(books), normalizeLeadList(leads));
        resolve(true);
      } catch (e) {
        console.error('autoSyncBooks failed:', e);
        resolve(false);
      }
    }, 300);
  });
}

// ─── Legacy aliases used by old components ─────────────────────
export async function pushToCloud(books: Book[], leads: Lead[]): Promise<boolean> {
  return autoSyncBooks(books, leads);
}

/** Compat alias used by the MegaAdmin settings screen */
export async function pushToCloudUrl(_databaseUrl: string, books: Book[], leads: Lead[]): Promise<boolean> {
  return autoSyncBooks(books, leads);
}

export async function pushLocalToCloud(): Promise<boolean> {
  const { books } = readLocal();
  return autoSyncBooks(books);
}

export function schedulePush(delayMs = 500): void {
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = setTimeout(async () => {
    const { books } = readLocal();
    await autoSyncBooks(books);
  }, delayMs);
}

// ─── Live Sync (real-time across every open browser) ──────────
let liveUnsub: (() => void) | null = null;
let liveCb: ((books: Book[], leads: Lead[]) => void) | null = null;

export function startLiveSync(callback: (books: Book[], leads: Lead[]) => void): () => void {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  liveCb = callback;

  try {
    liveUnsub = onValue(
      booksRef,
      (snap) => {
        try {
          if (suppressNextLive) return; // Our own write just echoed back

          const value = snap.val() as Record<string, unknown> | null;
          const books = normalizeBookList(value?.books);
          try { localStorage.setItem(LS_META, JSON.stringify({ at: new Date().toISOString(), client: 'remote' })); } catch { /* */ }
          if (liveCb && books.length > 0) liveCb(books, []);
        } catch (err) {
          console.warn('Live sync payload warning:', err);
        }
      },
      (error) => console.warn('Live sync error (using local fallback):', error)
    );
  } catch (err) {
    console.warn('startLiveSync listener error:', err);
  }

  return () => { if (liveUnsub) { liveUnsub(); liveUnsub = null; } liveCb = null; };
}

export function startLeadSync(callback: (leads: Lead[]) => void): () => void {
  return onValue(leadsRef, snap => {
    const value = snap.val() as Record<string, unknown> | null;
    callback(normalizeLeadList(value?.leads));
  });
}

export function stopLiveSync(): void {
  if (liveUnsub) { liveUnsub(); liveUnsub = null; }
  liveCb = null;
}

export function isSyncActiveFn(): boolean {
  return !!liveUnsub;
}

// ─── Connection Test ─────────────────────────────────────────────
export async function testConnection(_databaseUrl?: string): Promise<{ ok: boolean; message: string }> {
  try {
    await get(nexaRef);
    return { ok: true, message: 'Connected to Firebase Realtime Database.' };
  } catch (e) {
    return { ok: false, message: `Connection failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export function cancelScheduledPush(): void {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    stopLiveSync();
    cancelScheduledPush();
  });
}

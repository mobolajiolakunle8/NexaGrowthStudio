// ─────────────────────────────────────────────────────────────────
// Firebase Realtime Database — Automatic Cross-Browser Sync
//
// Data schema (single source of truth):
//   nexa/books : Book[]   (plain array — admin edits, last-write-wins)
//   nexa/leads : Lead[]   (plain array — merged by id, never lost)
//   nexa/meta  : { updatedAt, client }
// ─────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, set, onValue } from 'firebase/database';
import type { Book, Lead } from './types';

// ─── Local storage keys ──────────────────────────────────────────
const LS_BOOKS = 'nexa_books_v1';
const LS_LEADS = 'nexa_leads_v1';
const LS_META = 'nexa_cloud_meta';

const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Firebase configuration (env-first, fallback for prod) ──────
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

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/** Exported so assets.ts can reuse the same initialized app for Storage uploads. */
export const firebaseApp = app;

const db = getDatabase(app);
const booksRef = ref(db, 'nexa/books');
const leadsRef = ref(db, 'nexa/leads');
const metaRef = ref(db, 'nexa/meta');

// ─── Validation (guards against corrupt writes) ─────────────────
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

/** Merge two lead lists by id — nothing is ever lost between browsers. */
function mergeLeads(a: Lead[], b: Lead[]): Lead[] {
  const map = new Map<string, Lead>();
  for (const l of a) map.set(l.id, l);
  for (const l of b) {
    const existing = map.get(l.id);
    // Newer status/notes win (keep whichever record has more info)
    if (!existing || (l.notes && !existing.notes) || l.status !== 'New') map.set(l.id, l);
  }
  return Array.from(map.values()).sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
}

// ─── Local storage ───────────────────────────────────────────────
export function readLocal(): { books: Book[]; leads: Lead[] } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  try { const b = localStorage.getItem(LS_BOOKS); if (b) books = normalizeBookList(JSON.parse(b)); } catch { /* */ }
  try { const l = localStorage.getItem(LS_LEADS); if (l) leads = normalizeLeadList(JSON.parse(l)); } catch { /* */ }
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]): void {
  try { localStorage.setItem(LS_BOOKS, JSON.stringify(books)); } catch { /* */ }
  try { localStorage.setItem(LS_LEADS, JSON.stringify(leads)); } catch { /* */ }
  try { localStorage.setItem(LS_META, JSON.stringify({ at: new Date().toISOString(), client: clientId })); } catch { /* */ }
}

// ─── Settings helpers (MegaAdmin display) ───────────────────────
export function getEffectiveDbUrl(): string {
  return firebaseConfig.databaseURL;
}

export function getLastSync(): string | null {
  try {
    const raw = localStorage.getItem(LS_META);
    if (!raw) return null;
    return (JSON.parse(raw) as { at?: string }).at || null;
  } catch { return null; }
}

export function getLastSyncTime(): string | null {
  return getLastSync();
}

function markSynced() {
  try { localStorage.setItem(LS_META, JSON.stringify({ at: new Date().toISOString(), client: clientId })); } catch { /* */ }
}

// ─── Cloud reads ─────────────────────────────────────────────────
export async function fetchFromCloud(): Promise<{ books: Book[]; leads: Lead[] } | null> {
  try {
    const [bSnap, lSnap] = await Promise.all([get(booksRef), get(leadsRef)]);
    return {
      books: normalizeBookList(bSnap.exists() ? bSnap.val() : []),
      leads: normalizeLeadList(lSnap.exists() ? lSnap.val() : []),
    };
  } catch (e) {
    console.error('[sync] fetchFromCloud failed:', e);
    return null;
  }
}

/** Legacy alias — MegaAdmin "Load Latest" */
export async function pullFromCloud(_databaseUrl?: string): Promise<{ books: Book[]; leads: Lead[] } | null> {
  return fetchFromCloud();
}

// ─── Cloud writes (automatic, debounced) ─────────────────────────
let bookTimer: ReturnType<typeof setTimeout> | null = null;
let leadTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Realtime Database has a ~10MB per-node limit. A base64 PDF inside a book
 * would blow that limit, the write would fail, and the live listener would
 * then revert the UI to the older cloud data (making the book "disappear").
 * So we strip embedded (data:) files from the SYNCED copy only — the admin
 * keeps them locally, and metadata always syncs so books never vanish.
 * Hosted https:// links are tiny and always synced.
 */
const MAX_SYNC_BYTES = 3_000_000;

function stripEmbeddedFiles(books: Book[]): Book[] {
  return books.map((b) => {
    const clone: Book = { ...b };
    if (clone.customPdf && !/^https?:/i.test(clone.customPdf)) delete clone.customPdf;
    if (clone.coverImage && !/^https?:/i.test(clone.coverImage)) delete clone.coverImage;
    return clone;
  });
}

/** Write the full book list to the cloud. Every browser receives it live. */
export function syncBooks(books: Book[]): Promise<boolean> {
  let payload = normalizeBookList(books);
  // Safety net: never let an embedded file break sync for everyone
  if (JSON.stringify(payload).length > MAX_SYNC_BYTES) {
    console.warn('[sync] Payload too large — stripping embedded files so book data still syncs.');
    payload = stripEmbeddedFiles(payload);
  }
  if (bookTimer) clearTimeout(bookTimer);
  return new Promise<boolean>((resolve) => {
    bookTimer = setTimeout(async () => {
      try {
        await set(booksRef, payload);
        await set(metaRef, { updatedAt: new Date().toISOString(), client: clientId });
        const { leads } = readLocal();
        // Keep the admin's full local copy (with embedded files) locally
        writeLocal(books, leads);
        markSynced();
        resolve(true);
      } catch (e) {
        console.error('[sync] syncBooks failed:', e);
        resolve(false);
      }
    }, 250);
  });
}

/** Merge local leads with cloud leads by id, then write back. Never loses a lead. */
export function syncLeads(localLeads: Lead[]): Promise<boolean> {
  const clean = normalizeLeadList(localLeads);
  if (leadTimer) clearTimeout(leadTimer);
  return new Promise<boolean>((resolve) => {
    leadTimer = setTimeout(async () => {
      try {
        const snap = await get(leadsRef);
        const cloudLeads = normalizeLeadList(snap.exists() ? snap.val() : []);
        const merged = mergeLeads(cloudLeads, clean);
        await set(leadsRef, merged);
        const { books } = readLocal();
        writeLocal(books, merged);
        markSynced();
        resolve(true);
      } catch (e) {
        console.error('[sync] syncLeads failed:', e);
        resolve(false);
      }
    }, 250);
  });
}

// ─── Legacy compatibility aliases ────────────────────────────────
export function autoSyncBooks(books: Book[], leads: Lead[] = []): Promise<boolean> {
  const p1 = syncBooks(books);
  if (leads.length > 0) void syncLeads(leads);
  return p1;
}

export async function pushToCloud(books: Book[], leads: Lead[]): Promise<boolean> {
  const ok = await syncBooks(books);
  if (leads.length > 0) await syncLeads(leads);
  return ok;
}

export async function pushToCloudUrl(_databaseUrl: string, books: Book[], leads: Lead[]): Promise<boolean> {
  return pushToCloud(books, leads);
}

export async function pushLocalToCloud(): Promise<boolean> {
  const { books, leads } = readLocal();
  const ok = await syncBooks(books);
  if (leads.length > 0) await syncLeads(leads);
  return ok;
}

/** Called after saving a lead locally (BookLanding / BookAdmin). */
export function schedulePush(delayMs = 400): void {
  setTimeout(() => {
    const { leads } = readLocal();
    void syncLeads(leads);
  }, delayMs);
}

// ─── Live sync: every open browser updates in real time ─────────
let bookUnsub: (() => void) | null = null;
let leadUnsub: (() => void) | null = null;
let seeded = false;

export function startLiveSync(callback: (books: Book[], leads: Lead[]) => void): () => void {
  if (bookUnsub) { bookUnsub(); bookUnsub = null; }

  bookUnsub = onValue(
    booksRef,
    (snap) => {
      try {
        if (!snap.exists()) {
          // Cloud is empty (first ever run): seed it once from local data.
          if (!seeded) {
            seeded = true;
            const { books } = readLocal();
            if (books.length > 0) void syncBooks(books);
          }
          return;
        }
        const books = normalizeBookList(snap.val());
        markSynced();
        if (books.length > 0) callback(books, []);
      } catch (err) {
        console.warn('[sync] live books warning:', err);
      }
    },
    (error) => console.warn('[sync] live books error (check database rules):', error)
  );

  return () => { if (bookUnsub) { bookUnsub(); bookUnsub = null; } };
}

export function startLeadSync(callback: (leads: Lead[]) => void): () => void {
  if (leadUnsub) { leadUnsub(); leadUnsub = null; }
  leadUnsub = onValue(
    leadsRef,
    (snap) => {
      const leads = normalizeLeadList(snap.exists() ? snap.val() : []);
      if (leads.length > 0) callback(leads);
    },
    (error) => console.warn('[sync] live leads error:', error)
  );
  return () => { if (leadUnsub) { leadUnsub(); leadUnsub = null; } };
}

export function stopLiveSync(): void {
  if (bookUnsub) { bookUnsub(); bookUnsub = null; }
  if (leadUnsub) { leadUnsub(); leadUnsub = null; }
}

export function isSyncActiveFn(): boolean {
  return !!bookUnsub;
}

// ─── Connection test ─────────────────────────────────────────────
export async function testConnection(_databaseUrl?: string): Promise<{ ok: boolean; message: string }> {
  try {
    await get(metaRef);
    return { ok: true, message: 'Connected to Firebase Realtime Database.' };
  } catch (e) {
    return { ok: false, message: `Connection failed: ${e instanceof Error ? e.message : String(e)}. Check your database rules are published.` };
  }
}

export function cancelScheduledPush(): void {
  if (bookTimer) { clearTimeout(bookTimer); bookTimer = null; }
  if (leadTimer) { clearTimeout(leadTimer); leadTimer = null; }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => stopLiveSync());
}

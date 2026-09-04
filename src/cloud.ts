import type { Book, Lead } from './types';
import {
  BOOKS_STORAGE_KEY,
  LEADS_STORAGE_KEY,
  CLOUD_DB_URL_KEY,
  CLOUD_SYNC_ENABLED_KEY,
  CLOUD_LAST_SYNC_KEY,
} from './types';

/* ─────────────────────────────────────────────────────────────
   BAKED-IN DATABASE URL
   After you create your Firebase Realtime Database, paste your
   database URL here (or set it in Mega Admin → Settings on your
   admin device). When this constant is filled in and the site is
   rebuilt, EVERY visitor browser syncs automatically — no per-
   device setup needed.

   Example: 'https://nexa-books-default-rtdb.firebaseio.com'
────────────────────────────────────────────────────────────── */
export const DEFAULT_CLOUD_DB_URL = 'https://nexa-growth-studio-default-rtdb.firebaseio.com';

export function getEffectiveDbUrl(): string {
  try {
    const override = localStorage.getItem(CLOUD_DB_URL_KEY) || '';
    if (override.trim()) return normalizeDbUrl(override);
  } catch { /* */ }
  return DEFAULT_CLOUD_DB_URL ? normalizeDbUrl(DEFAULT_CLOUD_DB_URL) : '';
}

export function normalizeDbUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  // Allow pasting either the console URL or the .json endpoint
  u = u.replace(/\/nexa\.json$/, '').replace(/\.json$/, '');
  return u;
}

export function isSyncEnabled(): boolean {
  try {
    return localStorage.getItem(CLOUD_SYNC_ENABLED_KEY) === '1';
  } catch { return false; }
}

export function setSyncEnabled(on: boolean) {
  try { localStorage.setItem(CLOUD_SYNC_ENABLED_KEY, on ? '1' : '0'); } catch { /* */ }
}

export function setDbUrl(url: string) {
  try { localStorage.setItem(CLOUD_DB_URL_KEY, normalizeDbUrl(url)); } catch { /* */ }
}

export function getLastSync(): string | null {
  try { return localStorage.getItem(CLOUD_LAST_SYNC_KEY); } catch { return null; }
}

function markSynced() {
  try { localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString()); } catch { /* */ }
}

export interface CloudPayload {
  books: Book[];
  leads: Lead[];
  updatedAt: string;
}

function endpoint(dbUrl: string): string {
  return `${normalizeDbUrl(dbUrl)}/nexa.json`;
}

export async function testConnection(dbUrl: string): Promise<{ ok: boolean; message: string }> {
  const url = normalizeDbUrl(dbUrl);
  if (!url) return { ok: false, message: 'Enter a database URL first.' };
  if (!/^https:\/\/[a-z0-9-]+\.firebaseio\.com$/.test(url) && !/^https:\/\/[a-z0-9-]+\.firebasedatabase\.app$/.test(url) && !url.includes('firebaseio.com') && !url.includes('firebasedatabase.app')) {
    // Allow it anyway — custom domains / emulators exist — but warn
  }
  try {
    const res = await fetch(endpoint(url), { method: 'GET' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, message: `Database responded with ${res.status}. Check the URL and database rules. ${txt.slice(0, 120)}` };
    }
    return { ok: true, message: 'Connection successful — database is reachable.' };
  } catch (e) {
    return { ok: false, message: `Could not reach database: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function pullFromCloud(dbUrl: string): Promise<CloudPayload | null> {
  const res = await fetch(endpoint(dbUrl), { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`Pull failed with status ${res.status}`);
  const data = await res.json();
  if (!data) return null;
  return {
    books: Array.isArray(data.books) ? data.books : [],
    leads: Array.isArray(data.leads) ? data.leads : [],
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
  };
}

export async function pushToCloud(dbUrl: string, books: Book[], leads: Lead[]): Promise<void> {
  const payload: CloudPayload = { books, leads, updatedAt: new Date().toISOString() };
  const res = await fetch(endpoint(dbUrl), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Push failed with status ${res.status}`);
  markSynced();
}

export function readLocal(): { books: Book[]; leads: Lead[] } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  try {
    const b = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (b) books = JSON.parse(b);
  } catch { /* */ }
  try {
    const l = localStorage.getItem(LEADS_STORAGE_KEY);
    if (l) leads = JSON.parse(l);
  } catch { /* */ }
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch { /* quota? covers too big */ }
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch { /* */ }
}

/* Debounced auto-push so rapid edits don't spam the database */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePush(delayMs = 1500) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      const url = getEffectiveDbUrl();
      if (!url || !isSyncEnabled()) return;
      const { books, leads } = readLocal();
      await pushToCloud(url, books, leads);
    } catch (e) {
      console.warn('[cloud] auto-push failed', e);
    }
  }, delayMs);
}

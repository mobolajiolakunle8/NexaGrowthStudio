import type { Book, Lead } from './types';
import {
  BOOKS_STORAGE_KEY,
  LEADS_STORAGE_KEY,
  CLOUD_DB_URL_KEY,
  CLOUD_SYNC_ENABLED_KEY,
  CLOUD_LAST_SYNC_KEY,
} from './types';

// ── Firebase project (nexa-growth-studio) ──────────────────────
// Realtime Database URL — this is where books/leads sync to.
// When baked into the bundle, EVERY visitor syncs automatically.
// URL: https://nexa-growth-studio-default-rtdb.firebaseio.com
//
// How the code uses it:
//   - Default fallback if no per-device override found.
//   - Endpoint used: <url>/nexa.json
//   - Payload: { books: Book[], leads: Lead[], updatedAt: ISO }
//
// If you need to change the URL later (different Firebase project),
// edit this constant AND rebuild the site (npm run build).
export const DEFAULT_CLOUD_DB_URL = 'https://nexa-growth-studio-default-rtdb.firebaseio.com';

export function getEffectiveDbUrl(): string {
  try {
    const override = localStorage.getItem(CLOUD_DB_URL_KEY) || '';
    if (override.trim()) return normalizeDbUrl(override);
  } catch { /* per-device override missing — use baked default */ }
  return DEFAULT_CLOUD_DB_URL ? normalizeDbUrl(DEFAULT_CLOUD_DB_URL) : '';
}

export function normalizeDbUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  // Accept URLs with or without .json, /nexa.json suffixes.
  u = u.replace(/\/nexa\.json$/, '').replace(/\.json$/, '');
  return u;
}

export function isSyncEnabled(): boolean {
  try { return localStorage.getItem(CLOUD_SYNC_ENABLED_KEY) === '1'; }
  catch { return false; }
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

function endpoint(dbUrl: string): string {
  return `${normalizeDbUrl(dbUrl)}/nexa.json`;
}

export interface CloudPayload {
  books: Book[];
  leads: Lead[];
  updatedAt: string;
}

export async function testConnection(dbUrl: string): Promise<{ ok: boolean; message: string }> {
  const url = normalizeDbUrl(dbUrl);
  if (!url) return { ok: false, message: 'Enter a database URL first.' };
  // Any Firebase Realtime DB URL is fine. Don't fail on custom domains.
  try {
    const res = await fetch(endpoint(url), { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, message: `Database responded ${res.status}. Check URL + rules. ${txt.slice(0, 160)}` };
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
  try { const b = localStorage.getItem(BOOKS_STORAGE_KEY); if (b) books = JSON.parse(b); } catch { /* */ }
  try { const l = localStorage.getItem(LEADS_STORAGE_KEY); if (l) leads = JSON.parse(l); } catch { /* */ }
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch { /* quota exceeded */ }
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch { /* */ }
}

/* Debounced auto-push after any edit */
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

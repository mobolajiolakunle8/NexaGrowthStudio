import { useEffect, useRef, useState, useCallback } from 'react';
import { db } from './firebase';
import { ref, set, get, onValue, off } from 'firebase/database';
import type { Book, Lead } from './types';

const NEXA_REF = ref(db, 'nexa');

export interface CloudState {
  syncing: boolean;
  error: string | null;
  lastSync: string | null;
  online: boolean;
}

export interface CloudPayload {
  books: Book[];
  leads: Lead[];
}

// ── Local browser storage ──────────────────────────────────
export function readLocal(): { books: Book[]; leads: Lead[] } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  try { const b = localStorage.getItem('nexa_books_v1'); if (b) books = JSON.parse(b); } catch {}
  try { const l = localStorage.getItem('nexa_leads_v1'); if (l) leads = JSON.parse(l); } catch {}
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]) {
  try { localStorage.setItem('nexa_books_v1', JSON.stringify(books)); } catch {}
  try { localStorage.setItem('nexa_leads_v1', JSON.stringify(leads)); } catch {}
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
    const payload: CloudPayload = { books, leads, updatedAt: new Date().toISOString() };
    await set(NEXA_REF, payload);
    return true;
  } catch { return false; }
}

export async function pushLocalToCloud(): Promise<boolean> {
  const { books, leads } = readLocal();
  return pushToCloud(books, leads);
}

// ── Lazy connection test ───────────────────────────────────
export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await get(NEXA_REF);
    return { ok: true, message: 'Connected to Firebase Realtime Database.' };
  } catch (e) {
    return { ok: false, message: `Connection failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ── Component: CloudCore ───────────────────────────────────
interface Props {
  children: (state: CloudState, actions: {
    pushToCloud: () => Promise<boolean>;
    pullFromCloud: () => Promise<CloudPayload | null>;
    startLiveSync: (onUpdate: (books: Book[], leads: Lead[]) => void) => void;
  }) => React.ReactNode;
}

export default function CloudCore({ children }: Props) {
  const [state, setState] = useState<CloudState>({
    syncing: false,
    error: null,
    lastSync: null,
    online: false,
  });

  const liveRef = useRef<{ unsubscribe: () => void; callback: ((b: Book[], l: Lead[]) => void) } | null>(null);

  const pushToCloud = useCallback(async (): Promise<boolean> => {
    setState(s => ({ ...s, syncing: true, error: null }));
    const ok = await pushToCloud(readLocal().books, readLocal().leads);
    if (ok) {
      setState(s => ({ ...s, syncing: false, lastSync: new Date().toISOString(), online: true }));
    } else {
      setState(s => ({ ...s, syncing: false, error: 'Push to cloud failed.' }));
    }
    return ok;
  }, []);

  const pullFromCloud = useCallback(async (): Promise<CloudPayload | null> => {
    setState(s => ({ ...s, syncing: true, error: null }));
    const data = await fetchFromCloud();
    if (data) {
      writeLocal(data.books, data.leads);
      setState(s => ({ ...s, syncing: false, lastSync: new Date().toISOString(), online: true }));
    } else {
      setState(s => ({ ...s, syncing: false, error: 'Cloud database is empty or inaccessible.' }));
    }
    return data;
  }, []);

  const startLiveSync = useCallback((onUpdate: (books: Book[], leads: Lead[]) => void) => {
    if (liveRef.current) liveRef.current.unsubscribe();
    liveRef.current = { unsubscribe: () => {}, callback };

    const unsub = onValue(NEXA_REF, async (snap) => {
      if (!snap.exists()) {
        onUpdate([], []);
        return;
      }
      const data = snap.val();
      const books = Array.isArray(data.books) ? data.books : [];
      const leads = Array.isArray(data.leads) ? data.leads : [];
      writeLocal(books, leads);
      onUpdate(books, leads);
      setState(s => ({ ...s, lastSync: new Date().toISOString(), online: true, syncing: false }));
    }, (err) => {
      setState(s => ({ ...s, syncing: false, error: err.message, online: false }));
    });

    liveRef.current.unsubscribe = unsub;
    setState(s => ({ ...s, syncing: true }));
  }, []);

  useEffect(() => {
    const check = async () => {
      const { ok, message } = await testConnection();
      setState(s => ({ ...s, online: ok, error: !ok ? message : null }));
    };
    check();
  }, []);

  return (
    <>
      {children(state, {
        pushToCloud,
        pullFromCloud,
        startLiveSync: (cb) => startLiveSync(cb),
      })}
    </>
  );
}

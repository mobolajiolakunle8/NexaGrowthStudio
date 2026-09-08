import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getDatabase,
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { Book, Lead } from './types';
import { BOOKS_STORAGE_KEY, LEADS_STORAGE_KEY } from './types';

const env = import.meta.env;
const databaseURL = (env.VITE_FIREBASE_DATABASE_URL || 'https://nexa-growth-studio-default-rtdb.firebaseio.com')
  .replace(/^([^h])/, 'https://$1');

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nexa-growth-studio.firebaseapp.com',
  databaseURL,
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nexa-growth-studio',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'nexa-growth-studio.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1041308945872',
  appId: env.VITE_FIREBASE_APP_ID || '1:1041308945872:web:9ed3b79b0df00cc857fdd5',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// V2 isolates the reliable schema from older array/nested-array experiments.
const rootRef = ref(db, 'nexa/v2');
const catalogRef = ref(db, 'nexa/v2/catalog');
const leadsRef = ref(db, 'nexa/v2/leads');
const legacyBooksRef = ref(db, 'nexa/books');
const legacyLeadsRef = ref(db, 'nexa/leads');

interface CatalogPayload {
  initialized: true;
  items?: Record<string, Book>;
  updatedAt: string;
}

const values = <T,>(value: unknown): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as T[];
  if (typeof value === 'object') return Object.values(value as Record<string, T>).filter(Boolean);
  return [];
};

const isBook = (value: unknown): value is Book => {
  const book = value as Partial<Book> | null;
  return !!book && typeof book.id === 'string' && typeof book.title === 'string' && Array.isArray(book.whatsInside);
};

const isLead = (value: unknown): value is Lead => {
  const lead = value as Partial<Lead> | null;
  return !!lead && typeof lead.id === 'string' && typeof lead.bookId === 'string' && typeof lead.email === 'string';
};

const decodeBooks = (value: unknown): Book[] => {
  const payload = value as { items?: unknown; books?: unknown } | null;
  const source = payload?.items ?? payload?.books ?? value;
  return values<unknown>(source).filter(isBook);
};

const decodeLeads = (value: unknown): Lead[] => values<unknown>(value).filter(isLead)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const encodeBooks = (books: Book[]) => Object.fromEntries(
  books.filter(isBook).map(book => [book.id, JSON.parse(JSON.stringify(book))]),
);

export function readLocal(): { books: Book[]; leads: Lead[] } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (raw) books = JSON.parse(raw) as Book[];
  } catch { /* local fallback is optional */ }
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) leads = JSON.parse(raw) as Lead[];
  } catch { /* local fallback is optional */ }
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch { /* storage quota */ }
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch { /* storage quota */ }
}

/** Initialize once; an intentionally empty catalog remains empty. */
export async function bootstrapCloud(fallbackBooks: Book[]) {
  const [legacyBooks, legacyLeads] = await Promise.all([
    get(legacyBooksRef),
    get(legacyLeadsRef),
  ]);
  const migratedBooks = decodeBooks(legacyBooks.val());
  const migratedLeads = decodeLeads(
    (legacyLeads.val() as { leads?: unknown } | null)?.leads ?? legacyLeads.val(),
  );
  const initialBooks = migratedBooks.length ? migratedBooks : fallbackBooks;

  const result = await runTransaction(catalogRef, current => {
    if (current !== null) return current;
    return {
      initialized: true,
      items: encodeBooks(initialBooks),
      updatedAt: new Date().toISOString(),
    } satisfies CatalogPayload;
  }, { applyLocally: false });

  const leadSnapshot = await get(leadsRef);
  if (!leadSnapshot.exists() && migratedLeads.length) {
    await Promise.all(migratedLeads.map(createLeadInCloud));
  }
  return {
    books: decodeBooks(result.snapshot.val()),
    leads: leadSnapshot.exists() ? decodeLeads(leadSnapshot.val()) : migratedLeads,
  };
}

export function startLiveSync(callback: (books: Book[], leads: Lead[]) => void) {
  let books = readLocal().books;
  let leads = readLocal().leads;
  const emit = () => callback(books, leads);

  const stopBooks = onValue(catalogRef, snapshot => {
    if (!snapshot.exists()) return;
    books = decodeBooks(snapshot.val());
    writeLocal(books, leads);
    emit();
  }, error => console.error('Book sync failed:', error));

  const stopLeads = onValue(leadsRef, snapshot => {
    leads = decodeLeads(snapshot.val());
    writeLocal(books, leads);
    emit();
  }, error => console.error('Lead sync failed:', error));

  return () => {
    stopBooks();
    stopLeads();
  };
}

export function stopLiveSync() {
  // Listeners are closed by the unsubscribe returned from startLiveSync.
}

/** Book writes never touch leads. */
export async function saveBooksToCloud(books: Book[]) {
  const payload: CatalogPayload = {
    initialized: true,
    items: encodeBooks(books),
    updatedAt: new Date().toISOString(),
  };
  await set(catalogRef, payload);
  const local = readLocal();
  writeLocal(books, local.leads);
  localStorage.setItem('nexa_cloud_last_sync', payload.updatedAt);
  return true;
}

export const autoSyncBooks = async (books: Book[]) => saveBooksToCloud(books);

/** Lead creation appends one unique child and can never remove a book. */
export async function createLeadInCloud(lead: Lead) {
  await set(ref(db, `nexa/v2/leads/${lead.id}`), JSON.parse(JSON.stringify(lead)));
  return lead;
}

export async function updateLeadInCloud(id: string, changes: Partial<Lead>) {
  await update(ref(db, `nexa/v2/leads/${id}`), JSON.parse(JSON.stringify(changes)));
}

export async function deleteLeadInCloud(id: string) {
  await remove(ref(db, `nexa/v2/leads/${id}`));
}

export async function uploadBookAsset(bookId: string, kind: 'cover' | 'pdf', file: Blob, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const target = storageRef(storage, `book-assets/${bookId}/${kind}/${Date.now()}-${safeName}`);
  await uploadBytes(target, file, { contentType: file.type });
  return getDownloadURL(target);
}

export async function fetchFromCloud() {
  const [catalog, leads] = await Promise.all([get(catalogRef), get(leadsRef)]);
  return { books: decodeBooks(catalog.val()), leads: decodeLeads(leads.val()) };
}

export const pullFromCloud = async (_url?: string) => fetchFromCloud();
export const pushToCloud = async (books: Book[], leads: Lead[] = []) => {
  await saveBooksToCloud(books);
  await Promise.all(leads.map(createLeadInCloud));
  return true;
};
export const pushToCloudUrl = async (_url: string, books: Book[], leads: Lead[] = []) => pushToCloud(books, leads);
export const pushLocalToCloud = async () => {
  const local = readLocal();
  return pushToCloud(local.books, local.leads);
};

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePush(delayMs = 500) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushLocalToCloud(), delayMs);
}

export async function testConnection(_url?: string) {
  try {
    await get(rootRef);
    return { ok: true, message: `Connected to ${databaseURL}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Firebase connection failed.' };
  }
}

export const getEffectiveDbUrl = () => databaseURL;
export const setDbUrl = (_url: string) => undefined;
export const isSyncEnabled = () => true;
export const setSyncEnabled = (_enabled: boolean) => undefined;
export const getLastSync = () => localStorage.getItem('nexa_cloud_last_sync');
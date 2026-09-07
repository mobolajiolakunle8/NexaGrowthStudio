import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { get, onValue, push, ref, remove, set, update } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { Book, Lead } from './types';
import { BOOKS_STORAGE_KEY, LEADS_STORAGE_KEY } from './types';
import { auth, db, firebaseDatabaseUrl, storage } from './firebase';

const booksRef = ref(db, 'nexa/books');
const leadsRef = ref(db, 'nexa/leads');

const collectionToArray = <T,>(value: unknown): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as T[];
  if (typeof value === 'object') return Object.values(value as Record<string, T>);
  return [];
};

const isBook = (value: unknown): value is Book => {
  const item = value as Partial<Book> | null;
  return !!item && typeof item.id === 'string' && typeof item.title === 'string' && Array.isArray(item.whatsInside);
};

const isLead = (value: unknown): value is Lead => {
  const item = value as Partial<Lead> | null;
  return !!item && typeof item.id === 'string' && typeof item.bookId === 'string' && typeof item.email === 'string' && typeof item.phone === 'string';
};

const normalizeBooks = (value: unknown) => collectionToArray<unknown>(value).filter(isBook);
const normalizeLeads = (value: unknown) => collectionToArray<unknown>(value).filter(isLead);

export function readLocal(): { books: Book[]; leads: Lead[] } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (raw) books = JSON.parse(raw) as Book[];
  } catch { /* local fallback unavailable */ }
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) leads = JSON.parse(raw) as Lead[];
  } catch { /* local fallback unavailable */ }
  return { books, leads };
}

export function writeLocal(books: Book[], leads: Lead[]) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch { /* quota */ }
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch { /* quota */ }
}

export function subscribeToAdmin(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInAdmin(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutAdmin() {
  await signOut(auth);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No authenticated admin account.');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export function startLiveSync(callback: (books: Book[]) => void) {
  return onValue(booksRef, snapshot => callback(normalizeBooks(snapshot.val())));
}

export function startLeadSync(callback: (leads: Lead[]) => void) {
  if (!auth.currentUser) throw new Error('Admin sign-in required.');
  return onValue(leadsRef, snapshot => callback(normalizeLeads(snapshot.val())));
}

export async function fetchFromCloud() {
  const [bookSnapshot, leadSnapshot] = await Promise.all([
    get(booksRef),
    auth.currentUser ? get(leadsRef) : Promise.resolve(null),
  ]);
  return {
    books: normalizeBooks(bookSnapshot.val()),
    leads: leadSnapshot ? normalizeLeads(leadSnapshot.val()) : [],
  };
}

export async function saveBooksToCloud(books: Book[]) {
  if (!auth.currentUser) throw new Error('Admin sign-in required.');
  const payload = Object.fromEntries(books.map(book => {
    // Legacy browser passcodes must never be published in a public book record.
    const publicBook = { ...book } as Book & { adminPasscode?: string };
    delete publicBook.adminPasscode;
    if (publicBook.type === 'paid') delete publicBook.customPdf;
    return [book.id, JSON.parse(JSON.stringify(publicBook))];
  }));
  await set(booksRef, payload);
  localStorage.setItem('nexa_cloud_last_sync', new Date().toISOString());
}

export async function createLeadInCloud(lead: Lead) {
  const id = lead.id || push(leadsRef).key || crypto.randomUUID();
  const publicLead = {
    id,
    bookId: lead.bookId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    date: lead.date,
    status: 'New',
    ...(lead.paid === false ? { paid: false } : {}),
  };
  await set(ref(db, `nexa/leads/${id}`), publicLead);
  return { ...lead, ...publicLead } as Lead;
}

export async function updateLeadInCloud(id: string, changes: Partial<Lead>) {
  if (!auth.currentUser) throw new Error('Admin sign-in required.');
  await update(ref(db, `nexa/leads/${id}`), changes);
}

export async function deleteLeadInCloud(id: string) {
  if (!auth.currentUser) throw new Error('Admin sign-in required.');
  await remove(ref(db, `nexa/leads/${id}`));
}

export async function uploadBookAsset(
  bookId: string,
  kind: 'cover' | 'pdf',
  file: Blob,
  filename: string,
  publicPdf = true,
) {
  if (!auth.currentUser) throw new Error('Admin sign-in required.');
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const folder = kind === 'cover' ? `books/${bookId}/cover` : publicPdf ? `books/${bookId}/public-pdf` : `private-books/${bookId}/pdf`;
  const target = storageRef(storage, `${folder}/${Date.now()}-${safeName}`);
  await uploadBytes(target, file, { contentType: file.type });
  const url = await getDownloadURL(target);
  if (kind === 'pdf' && !publicPdf) {
    await set(ref(db, `nexa/privateAssets/${bookId}/pdfUrl`), url);
  }
  return url;
}

export async function getPrivatePdfUrl(bookId: string) {
  if (!auth.currentUser) throw new Error('Admin sign-in required.');
  const snapshot = await get(ref(db, `nexa/privateAssets/${bookId}/pdfUrl`));
  return snapshot.exists() && typeof snapshot.val() === 'string' ? snapshot.val() as string : null;
}

export async function testConnection(_databaseUrl?: string) {
  try {
    await get(booksRef);
    return { ok: true, message: `Connected to ${firebaseDatabaseUrl}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Firebase connection failed.' };
  }
}

export const getEffectiveDbUrl = () => firebaseDatabaseUrl;
export const setDbUrl = (_url: string) => undefined;
export const isSyncEnabled = () => true;
export const setSyncEnabled = (_enabled: boolean) => undefined;
export const getLastSync = () => localStorage.getItem('nexa_cloud_last_sync');
export const pullFromCloud = async (_databaseUrl?: string) => fetchFromCloud();
export const pushToCloud = async (...args: unknown[]) => {
  const books = (args.length === 3 ? args[1] : args[0]) as Book[];
  const leads = normalizeLeads(args.length === 3 ? args[2] : args[1]);
  await saveBooksToCloud(books);
  if (auth.currentUser) {
    const leadPayload = Object.fromEntries(leads.map(lead => [lead.id, JSON.parse(JSON.stringify(lead))]));
    await set(leadsRef, leadPayload);
  }
  return true;
};

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePush(delayMs = 500) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    if (!auth.currentUser) return;
    const { books } = readLocal();
    await saveBooksToCloud(books).catch(console.error);
  }, delayMs);
}

export const stopLiveSync = () => undefined;

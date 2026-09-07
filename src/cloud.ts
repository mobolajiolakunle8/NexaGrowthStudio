import type { User } from 'firebase/auth';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { get, onValue, push, ref, remove, set, update } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { Book, Lead } from './types';
import { auth, db, storage } from './firebase';

export interface CloudPayload {
  books: Book[];
  leads: Lead[];
}

export interface AdminSession {
  uid: string;
  email: string;
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function publicBook(book: Book): Book {
  const safe = clean(book);
  if (safe.type === 'paid') delete safe.customPdf;
  return safe;
}

function valuesToArray<T>(value: Record<string, T> | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : Object.values(value);
}

export async function isAuthorizedAdmin(user: User | null = auth.currentUser): Promise<boolean> {
  if (!user) return false;
  const snapshot = await get(ref(db, `admins/${user.uid}`));
  return snapshot.val() === true;
}

export function observeAdminSession(callback: (session: AdminSession | null) => void): () => void {
  return onAuthStateChanged(auth, async user => {
    try {
      const allowed = await isAuthorizedAdmin(user);
      callback(allowed && user ? { uid: user.uid, email: user.email || '' } : null);
    } catch {
      callback(null);
    }
  });
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!(await isAuthorizedAdmin(credential.user))) {
    await signOut(auth);
    throw new Error('This account is not registered as a Nexa administrator.');
  }
  return { uid: credential.user.uid, email: credential.user.email || '' };
}

export async function logoutAdmin(): Promise<void> {
  await signOut(auth);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('No authenticated administrator.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export function subscribePublicBooks(callback: (books: Book[]) => void, onError?: (error: Error) => void): () => void {
  return onValue(
    ref(db, 'public/books'),
    snapshot => callback(valuesToArray<Book>(snapshot.val())),
    error => onError?.(error),
  );
}

export function subscribeAdminData(callback: (payload: CloudPayload) => void, onError?: (error: Error) => void): () => void {
  let books: Book[] = [];
  let leads: Lead[] = [];
  const emit = () => callback({ books, leads });
  const stopBooks = onValue(
    ref(db, 'private/books'),
    snapshot => {
      books = valuesToArray<Book>(snapshot.val());
      emit();
    },
    error => onError?.(error),
  );
  const stopLeads = onValue(
    ref(db, 'leads'),
    snapshot => {
      leads = valuesToArray<Lead>(snapshot.val()).sort((a, b) => b.date.localeCompare(a.date));
      emit();
    },
    error => onError?.(error),
  );
  return () => {
    stopBooks();
    stopLeads();
  };
}

export async function fetchPublicBooks(): Promise<Book[]> {
  const snapshot = await get(ref(db, 'public/books'));
  return valuesToArray<Book>(snapshot.val());
}

export async function fetchAdminData(): Promise<CloudPayload> {
  if (!(await isAuthorizedAdmin())) throw new Error('Administrator authentication required.');
  const [booksSnapshot, leadsSnapshot] = await Promise.all([
    get(ref(db, 'private/books')),
    get(ref(db, 'leads')),
  ]);
  return {
    books: valuesToArray<Book>(booksSnapshot.val()),
    leads: valuesToArray<Lead>(leadsSnapshot.val()),
  };
}

export async function saveBooksToCloud(books: Book[]): Promise<void> {
  if (!(await isAuthorizedAdmin())) throw new Error('Administrator authentication required.');
  await update(ref(db), {
    'public/books': clean(books.filter(book => book.published).map(publicBook)),
    'private/books': clean(books),
    'meta/updatedAt': new Date().toISOString(),
  });
}

export async function createLeadInCloud(lead: Lead): Promise<void> {
  const id = lead.id || push(ref(db, 'leads')).key;
  if (!id) throw new Error('Could not create lead ID.');
  await set(ref(db, `leads/${id}`), clean({ ...lead, id }));
}

export async function updateLeadInCloud(id: string, patch: Partial<Lead>): Promise<void> {
  if (!(await isAuthorizedAdmin())) throw new Error('Administrator authentication required.');
  await update(ref(db, `leads/${id}`), clean(patch));
}

export async function deleteLeadFromCloud(id: string): Promise<void> {
  if (!(await isAuthorizedAdmin())) throw new Error('Administrator authentication required.');
  await remove(ref(db, `leads/${id}`));
}

export async function uploadBookAsset(bookId: string, kind: 'cover' | 'pdf', file: File): Promise<string> {
  if (!(await isAuthorizedAdmin())) throw new Error('Administrator authentication required.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const folder = kind === 'cover' ? 'covers' : 'files';
  const assetRef = storageRef(storage, `book-assets/${bookId}/${folder}/${Date.now()}-${safeName}`);
  await uploadBytes(assetRef, file, { contentType: file.type });
  return getDownloadURL(assetRef);
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await get(ref(db, 'public/books'));
    return { ok: true, message: 'Connected to Nexa Firebase Realtime Database.' };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Firebase connection failed.' };
  }
}
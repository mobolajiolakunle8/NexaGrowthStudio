// ─────────────────────────────────────────────────────────────
// Firebase Storage uploads
// Uploading the actual PDF / cover to Storage gives back a SHORT
// https:// download URL. That URL is stored in the book record and
// syncs instantly to every browser — so unlimited visitors can
// download the same book, and the book never disappears.
// ─────────────────────────────────────────────────────────────

import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from './cloud';

const storage = getStorage(firebaseApp);

/** Upload the book PDF and return its public https download URL. */
export async function uploadBookPdf(file: File, bookSlug: string): Promise<string> {
  const path = `books/${bookSlug}/book-${Date.now()}.pdf`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file, { contentType: 'application/pdf' });
  return await getDownloadURL(r);
}

/** Upload the cover image and return its public https URL. */
export async function uploadBookCover(file: File, bookSlug: string): Promise<string> {
  const path = `books/${bookSlug}/cover-${Date.now()}`;
  const r = storageRef(storage, path);
  await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
  return await getDownloadURL(r);
}

/** True when the value is a shareable web link (not an embedded data URL). */
export function isHostedLink(v?: string): boolean {
  return !!v && /^https?:\/\//i.test(v);
}

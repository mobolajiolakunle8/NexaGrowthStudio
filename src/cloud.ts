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
import type { Article, ArticleComment, ArticleReply, Book, Lead, SiteSettings, Subscriber } from './types';
import {
  ARTICLES_STORAGE_KEY,
  BOOKS_STORAGE_KEY,
  LEADS_STORAGE_KEY,
  SITE_SETTINGS_STORAGE_KEY,
  DEFAULT_SITE_SETTINGS,
} from './types';

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

// V2 isolated schema
const rootRef = ref(db, 'nexa/v2');
const catalogRef = ref(db, 'nexa/v2/catalog');
const leadsRef = ref(db, 'nexa/v2/leads');
const settingsRef = ref(db, 'nexa/v2/settings');
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

export function readLocal(): { books: Book[]; leads: Lead[]; settings: SiteSettings } {
  let books: Book[] = [];
  let leads: Lead[] = [];
  let settings: SiteSettings = DEFAULT_SITE_SETTINGS;
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (raw) books = JSON.parse(raw) as Book[];
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) leads = JSON.parse(raw) as Lead[];
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
    if (raw) settings = { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { books, leads, settings };
}

export function writeLocal(books: Book[], leads: Lead[], settings?: SiteSettings) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch { /* ignore */ }
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch { /* ignore */ }
  if (settings) {
    try { localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }
}

export async function bootstrapCloud(fallbackBooks: Book[]) {
  const [legacyBooks, legacyLeads] = await Promise.all([
    get(legacyBooksRef).catch(() => null),
    get(legacyLeadsRef).catch(() => null),
  ]);
  const migratedBooks = legacyBooks ? decodeBooks(legacyBooks.val()) : [];
  const migratedLeads = legacyLeads
    ? decodeLeads((legacyLeads.val() as { leads?: unknown } | null)?.leads ?? legacyLeads.val())
    : [];
  const initialBooks = migratedBooks.length ? migratedBooks : fallbackBooks;

  const result = await runTransaction(catalogRef, current => {
    if (current !== null) return current;
    return {
      initialized: true,
      items: encodeBooks(initialBooks),
      updatedAt: new Date().toISOString(),
    } satisfies CatalogPayload;
  }, { applyLocally: false });

  const [leadSnapshot, settingsSnapshot] = await Promise.all([
    get(leadsRef).catch(() => null),
    get(settingsRef).catch(() => null),
  ]);

  if (leadSnapshot && !leadSnapshot.exists() && migratedLeads.length) {
    await Promise.all(migratedLeads.map(createLeadInCloud)).catch(() => null);
  }

  let cloudSettings = DEFAULT_SITE_SETTINGS;
  if (settingsSnapshot && settingsSnapshot.exists()) {
    cloudSettings = { ...DEFAULT_SITE_SETTINGS, ...(settingsSnapshot.val() as SiteSettings) };
    try { localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(cloudSettings)); } catch { /* ignore */ }
  }

  return {
    books: decodeBooks(result.snapshot.val()),
    leads: leadSnapshot && leadSnapshot.exists() ? decodeLeads(leadSnapshot.val()) : migratedLeads,
    settings: cloudSettings,
  };
}

export function startLiveSync(
  callback: (books: Book[], leads: Lead[], settings: SiteSettings) => void
) {
  let { books, leads, settings } = readLocal();
  const emit = () => callback(books, leads, settings);

  const stopBooks = onValue(catalogRef, snapshot => {
    if (!snapshot.exists()) return;
    books = decodeBooks(snapshot.val());
    writeLocal(books, leads, settings);
    emit();
  }, error => console.error('Book sync failed:', error));

  const stopLeads = onValue(leadsRef, snapshot => {
    leads = decodeLeads(snapshot.val());
    writeLocal(books, leads, settings);
    emit();
  }, error => console.error('Lead sync failed:', error));

  const stopSettings = onValue(settingsRef, snapshot => {
    if (snapshot.exists()) {
      settings = { ...DEFAULT_SITE_SETTINGS, ...(snapshot.val() as SiteSettings) };
      try { localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
      emit();
    }
  }, error => console.error('Settings sync failed:', error));

  return () => {
    stopBooks();
    stopLeads();
    stopSettings();
  };
}

export function stopLiveSync() {
  // handled by cleanup returned from startLiveSync
}

export async function saveBooksToCloud(books: Book[]) {
  const payload: CatalogPayload = {
    initialized: true,
    items: encodeBooks(books),
    updatedAt: new Date().toISOString(),
  };
  await set(catalogRef, payload);
  const local = readLocal();
  writeLocal(books, local.leads, local.settings);
  localStorage.setItem('nexa_cloud_last_sync', payload.updatedAt);
  return true;
}

export const autoSyncBooks = async (books: Book[]) => saveBooksToCloud(books);

export async function saveSiteSettingsToCloud(settings: SiteSettings) {
  await set(settingsRef, JSON.parse(JSON.stringify(settings)));
  try {
    localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem('nexa_cloud_last_sync', new Date().toISOString());
  } catch { /* ignore */ }
  return true;
}

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

const subscribersRef = ref(db, 'nexa/v2/subscribers');

const isSubscriber = (value: unknown): value is Subscriber => {
  const s = value as Partial<Subscriber> | null;
  return !!s && typeof s.id === 'string' && typeof s.email === 'string';
};

const decodeSubscribers = (value: unknown): Subscriber[] =>
  values<unknown>(value).filter(isSubscriber).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

/** Add a subscriber, skipping duplicates by email. Returns 'added' | 'exists'. */
export async function addSubscriberInCloud(sub: Subscriber): Promise<'added' | 'exists'> {
  const existing = await get(subscribersRef).catch(() => null);
  const all = existing && existing.exists() ? decodeSubscribers(existing.val()) : [];
  if (all.some(s => s.email.toLowerCase() === sub.email.toLowerCase() && s.status !== 'unsubscribed')) {
    return 'exists';
  }
  const revived = all.find(s => s.email.toLowerCase() === sub.email.toLowerCase());
  if (revived) {
    await update(ref(db, `nexa/v2/subscribers/${revived.id}`), { status: 'active', date: sub.date });
    return 'added';
  }
  await set(ref(db, `nexa/v2/subscribers/${sub.id}`), JSON.parse(JSON.stringify(sub)));
  return 'added';
}

export async function unsubscribeSubscriber(id: string) {
  await update(ref(db, `nexa/v2/subscribers/${id}`), { status: 'unsubscribed' });
}

export async function deleteSubscriber(id: string) {
  await remove(ref(db, `nexa/v2/subscribers/${id}`));
}

export function startSubscriberSync(callback: (subs: Subscriber[]) => void) {
  return onValue(subscribersRef, snapshot => {
    callback(decodeSubscribers(snapshot.exists() ? snapshot.val() : []));
  }, error => console.error('Subscriber sync failed:', error));
}

// ─── Articles ────────────────────────────────────────────────────
const articlesRef = ref(db, 'nexa/v2/articles');

const isReply = (value: unknown): value is ArticleReply => {
  const r = value as Partial<ArticleReply> | null;
  return !!r && typeof r.id === 'string' && typeof r.name === 'string' && typeof r.message === 'string';
};

const isComment = (value: unknown): value is ArticleComment => {
  const c = value as Partial<ArticleComment> | null;
  return !!c && typeof c.id === 'string' && typeof c.name === 'string' && typeof c.message === 'string';
};

const isArticle = (value: unknown): value is Article => {
  const a = value as Partial<Article> | null;
  return !!a && typeof a.id === 'string' && typeof a.slug === 'string' && typeof a.title === 'string';
};

const normalizeArticle = (value: unknown): Article | null => {
  if (!isArticle(value)) return null;
  const a = value as Partial<Article>;
  return {
    id: a.id!,
    slug: a.slug!,
    title: a.title!,
    excerpt: typeof a.excerpt === 'string' ? a.excerpt : '',
    category: typeof a.category === 'string' && a.category ? a.category : 'General',
    tags: Array.isArray(a.tags) ? a.tags.filter(t => typeof t === 'string') : [],
    body: typeof a.body === 'string' ? a.body : '',
    coverImage: typeof a.coverImage === 'string' ? a.coverImage : undefined,
    images: Array.isArray(a.images) ? a.images.filter(i => typeof i === 'string') : [],
    likes: Array.isArray(a.likes) ? a.likes.filter(l => typeof l === 'string') : [],
    comments: Array.isArray(a.comments)
      ? a.comments.filter(isComment).map(c => ({
          ...c,
          likes: Array.isArray(c.likes) ? c.likes.filter(l => typeof l === 'string') : [],
          replies: Array.isArray(c.replies) ? c.replies.filter(isReply) : [],
        }))
      : [],
    published: a.published !== false,
    featured: a.featured === true,
    createdAt: typeof a.createdAt === 'string' ? a.createdAt : new Date().toISOString(),
    updatedAt: typeof a.updatedAt === 'string' ? a.updatedAt : new Date().toISOString(),
  };
};

const decodeArticles = (value: unknown): Article[] =>
  values<unknown>(value)
    .map(normalizeArticle)
    .filter((a): a is Article => a !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export function loadArticlesLocal(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_STORAGE_KEY);
    if (!raw) return [];
    return decodeArticles(JSON.parse(raw));
  } catch { return []; }
}

export function saveArticlesLocal(articles: Article[]) {
  try { localStorage.setItem(ARTICLES_STORAGE_KEY, JSON.stringify(articles)); } catch { /* ignore */ }
}

export function startArticleSync(callback: (articles: Article[]) => void) {
  return onValue(articlesRef, snapshot => {
    const articles = decodeArticles(snapshot.exists() ? snapshot.val() : []);
    saveArticlesLocal(articles);
    callback(articles);
  }, error => console.error('Article sync failed:', error));
}

/** Publisher creates or updates a full article. */
export async function saveArticleToCloud(article: Article) {
  const payload = { ...normalizeArticle(article)!, updatedAt: new Date().toISOString() };
  await set(ref(db, `nexa/v2/articles/${article.id}`), JSON.parse(JSON.stringify(payload)));
  return payload;
}

export async function deleteArticleInCloud(id: string) {
  await remove(ref(db, `nexa/v2/articles/${id}`));
}

/** Toggle a like on an article (one per anonymous visitor id). Safe under concurrency. */
export async function toggleArticleLike(articleId: string, visitorId: string): Promise<string[]> {
  const likesRef = ref(db, `nexa/v2/articles/${articleId}/likes`);
  const result = await runTransaction(likesRef, (current: unknown) => {
    const list = Array.isArray(current) ? current.filter((l): l is string => typeof l === 'string') : [];
    return list.includes(visitorId) ? list.filter(l => l !== visitorId) : [...list, visitorId];
  }, { applyLocally: false });
  return Array.isArray(result.snapshot.val()) ? (result.snapshot.val() as string[]) : [];
}

/** Append a top-level comment. */
export async function addArticleComment(articleId: string, comment: ArticleComment) {
  await set(
    ref(db, `nexa/v2/articles/${articleId}/comments/${comment.id}`),
    JSON.parse(JSON.stringify({ ...comment, likes: comment.likes || [], replies: comment.replies || [] }))
  );
}

/** Append a reply to a comment. */
export async function addArticleReply(articleId: string, commentId: string, reply: ArticleReply) {
  await set(
    ref(db, `nexa/v2/articles/${articleId}/comments/${commentId}/replies/${reply.id}`),
    JSON.parse(JSON.stringify(reply))
  );
}

/** Toggle a like on a comment. */
export async function toggleCommentLike(articleId: string, commentId: string, visitorId: string): Promise<string[]> {
  const likesRef = ref(db, `nexa/v2/articles/${articleId}/comments/${commentId}/likes`);
  const result = await runTransaction(likesRef, (current: unknown) => {
    const list = Array.isArray(current) ? current.filter((l): l is string => typeof l === 'string') : [];
    return list.includes(visitorId) ? list.filter(l => l !== visitorId) : [...list, visitorId];
  }, { applyLocally: false });
  return Array.isArray(result.snapshot.val()) ? (result.snapshot.val() as string[]) : [];
}

export async function uploadBookAsset(bookId: string, kind: 'cover' | 'pdf' | 'founder', file: Blob, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  const target = storageRef(storage, `site-assets/${bookId}/${kind}/${Date.now()}-${safeName}`);
  const timeout = <T,>(promise: Promise<T>, message: string) => new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), 15000);
    promise.then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); },
    );
  });

  // Storage may not be enabled on a Firebase project yet. Never leave the
  // dashboard stuck in an endless upload state — fail with an actionable error.
  await timeout(
    uploadBytes(target, file, { contentType: file.type }),
    'Firebase Storage did not respond. Enable Storage in Firebase Console or use a hosted link.',
  );
  return timeout(
    getDownloadURL(target),
    'File uploaded but Firebase Storage did not return its download link.',
  );
}

export async function fetchFromCloud() {
  const [catalog, leads, settingsSnap] = await Promise.all([
    get(catalogRef),
    get(leadsRef),
    get(settingsRef).catch(() => null),
  ]);
  const settings = settingsSnap && settingsSnap.exists()
    ? { ...DEFAULT_SITE_SETTINGS, ...(settingsSnap.val() as SiteSettings) }
    : DEFAULT_SITE_SETTINGS;
  return {
    books: decodeBooks(catalog.val()),
    leads: decodeLeads(leads.val()),
    settings,
  };
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

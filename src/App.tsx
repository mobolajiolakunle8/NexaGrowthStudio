import { useEffect, useState, useCallback } from 'react';
import type { Book, Lead } from './types';
import { MEGA_ADMIN_PASSCODE_KEY, MEGA_ADMIN_DEFAULT } from './types';
import { loadBooks, saveBooks } from './storage';
import { autoSyncBooks, bootstrapCloud, startLiveSync, stopLiveSync, testConnection } from './cloud';
import MegaAdmin from './components/MegaAdmin';
import BookAdmin from './components/BookAdmin';
import BookLanding from './components/BookLanding';
import PublishingHome from './components/PublishingHome';

// ─── Hash parsing ──────────────────────────────────────────────
function parseHash(): {
  bookSlug?: string;
  megaAdmin?: boolean;
  bookAdmin?: string;
} {
  const raw = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
  if (raw === 'admin' || raw === 'admin/login') return { megaAdmin: true };
  if (raw.startsWith('admin/book/')) return { bookAdmin: raw.replace('admin/book/', '') };
  if (raw.startsWith('book/')) return { bookSlug: raw.replace('book/', '') };
  return {};
}

// ─── Seed book ──────────────────────────────────────────────────
const SEED_BOOK: Book = {
  id: 'seed_sbsp_001',
  slug: 'small-business-sales-playbook',
  title: 'The Small Business Sales Playbook',
  subtitle: 'A practical, no-fluff guide to closing more sales and growing your business — written for Nigerian small business owners.',
  author: 'Olakunle Samuel',
  authorRole: 'Nexa Growth Studio — Ibadan, Nigeria',
  kicker: 'Free Guide · No Strings Attached',
  type: 'free',
  whatsInside: [
    'A simple framework for understanding your ideal customer and speaking directly to their needs.',
    'Proven sales conversation scripts tailored for Nigerian market dynamics — no generic templates.',
    'How to close deals confidently without being pushy — practical guidance for everyday business.',
  ],
  ctaTitle: 'Get your free copy',
  ctaSubtitle: 'Enter your details. The guide is delivered to you immediately.',
  adminWhatsapp: '+2349030192034',
  adminPasscode: 'admin123',
  published: true,
  createdAt: new Date().toISOString(),
  donation: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    thankYouMessage: "Thank you for downloading The Small Business Sales Playbook! We hope it transforms your sales and helps you grow the business you deserve. If this guide added value, please consider supporting our work so we can keep creating free resources for Nigerian business owners.",
    donationMessage: 'Support our work — donate any amount you wish.',
  },
};

// ─── Types ──────────────────────────────────────────────────────
type ViewMode =
  | { type: 'landing'; book: Book }
  | { type: 'book-admin'; book: Book }
  | { type: 'mega-admin' }
  | { type: 'none' };

// ─── App ──────────────────────────────────────────────────────────
export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const stored = loadBooks();
      if (stored && stored.length > 0) {
        return stored;
      }
    } catch (e) {
      console.warn('Could not read local books, falling back to seed book', e);
    }
    saveBooks([SEED_BOOK]);
    return [SEED_BOOK];
  });

  const [view, setView] = useState<ViewMode>({ type: 'none' });
  const [megaPasscodeOpen, setMegaPasscodeOpen] = useState(false);
  const [megaCode, setMegaCode] = useState('');
  const [megaErr, setMegaErr] = useState('');
  const [megaPasscode, setMegaPasscode] = useState<string>(() => {
    try {
      return localStorage.getItem(MEGA_ADMIN_PASSCODE_KEY) ?? MEGA_ADMIN_DEFAULT;
    } catch {
      return MEGA_ADMIN_DEFAULT;
    }
  });

  // Connection state drives console diagnostics; the public homepage stays
  // clean and editorial, so we only track the value without surfacing it.
  const [, setIsOnline] = useState(false);
  const [, setLastSyncStr] = useState<string | null>(null);
  const [, setLeadRevision] = useState(0);

  // ── Live sync across all browsers (real-time WebSocket) ──
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = startLiveSync((fbooks: Book[], _fleads: Lead[]) => {
        if (Array.isArray(fbooks)) {
          setBooks(fbooks);
          saveBooks(fbooks);
          setIsOnline(true);
          setLastSyncStr(new Date().toISOString());
        }
        // Lead changes do not alter the catalog reference, so force the admin
        // views to re-read their local lead cache after every Firebase event.
        setLeadRevision(value => value + 1);
      });
    } catch (err) {
      console.warn('Realtime live sync error fallback:', err);
    }

    testConnection().then(r => {
      setIsOnline(r.ok);
      if (r.ok) setLastSyncStr(new Date().toISOString());
    }).catch(() => setIsOnline(false));

    return () => {
      if (unsubscribe) unsubscribe();
      stopLiveSync();
    };
  }, []);

  // ── First-load reconciliation ──────────────────────────────────
  // Runs once per app load. It NEVER blindly overwrites the shared cloud
  // collection. Instead:
  //   • If the cloud already has books  → adopt them as the source of truth.
  //   • If the cloud is genuinely empty → publish this browser's current
  //     books ONCE, seeding the shared collection for every other browser.
  // This is what makes cross-browser sync actually work: no browser can ever
  // race another browser's data away just by loading the page.
  useEffect(() => {
    void (async () => {
      try {
        const localBooks = loadBooks();
        const cloud = await bootstrapCloud(localBooks.length ? localBooks : [SEED_BOOK]);
        setBooks(cloud.books);
        saveBooks(cloud.books);
        setIsOnline(true);
        setLastSyncStr(new Date().toISOString());
      } catch (error) {
        console.error('Cloud bootstrap failed; using local catalog:', error);
        setIsOnline(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hash routing ──
  useEffect(() => {
    const handleHash = () => {
      const parsed = parseHash();
      if (parsed.megaAdmin) {
        setMegaPasscodeOpen(true);
        return;
      }
      if (parsed.bookAdmin) {
        const book = books.find(b => b.slug === parsed.bookAdmin);
        if (book) {
          setView({ type: 'book-admin', book });
          return;
        }
      }
      if (parsed.bookSlug) {
        const book = books.find(b => b.slug === parsed.bookSlug);
        if (book) {
          setView({ type: 'landing', book });
          return;
        }
      }
      setView({ type: 'none' });
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [books]);

  // Every change pushes automatically to Firebase → all browsers update in real time.
  // force: true because this is always triggered by an explicit admin action
  // (add/edit/delete/publish), including the legitimate case of deleting the
  // very last remaining book.
  const handleBooksChange = useCallback((updated: Book[]) => {
    setBooks(updated);
    saveBooks(updated);
    autoSyncBooks(updated).catch(() => {});
  }, []);

  const handleUpdateBook = (updated: Book) => {
    const newBooks = books.map(b => b.id === updated.id ? updated : b);
    handleBooksChange(newBooks);
    setView({ type: 'book-admin', book: updated });
  };

  const handleMegaLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (megaCode === megaPasscode) {
      setView({ type: 'mega-admin' });
      setMegaPasscodeOpen(false);
      setMegaCode('');
      setMegaErr('');
    } else {
      setMegaErr('Incorrect passcode.');
    }
  };

  const handleMegaPasscodeChanged = (next: string) => setMegaPasscode(next);
  const handleViewLanding = (book: Book) => { window.location.hash = `/book/${book.slug}`; };

  const renderMain = () => {
    if (view.type === 'mega-admin') {
      return (
        <MegaAdmin
          books={books}
          onBooksChange={handleBooksChange}
          onEditBook={book => setView({ type: 'book-admin', book })}
          onViewLanding={handleViewLanding}
          megaPasscode={megaPasscode}
          onMegaPasscodeChanged={handleMegaPasscodeChanged}
        />
      );
    }
    if (view.type === 'book-admin') {
      return (
        <BookAdmin
          book={view.book}
          onUpdateBook={handleUpdateBook}
          onBack={() => setView({ type: 'mega-admin' })}
        />
      );
    }
    if (view.type === 'landing') {
      return (
        <BookLanding book={view.book} onAdminAccess={() => setView({ type: 'book-admin', book: view.book })} />
      );
    }

    // ── Hub: Publishing-house homepage for all titles ──
    return <PublishingHome books={books} />;
  };

  return (
    <>
      {renderMain()}

      {/* Mega Admin Passcode Modal */}
      {megaPasscodeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6" onClick={() => setMegaPasscodeOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500 text-slate-950 font-black text-sm w-7 h-7 rounded flex items-center justify-center">N</span>
              <h3 className="font-[Space_Grotesk] text-lg font-bold text-amber-400">Nexa HQ Access</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">Enter the Mega Admin passcode to manage all books.</p>
            <form onSubmit={handleMegaLogin} className="flex flex-col gap-3">
              <input 
                required 
                type="password" 
                placeholder="Enter mega admin passcode" 
                value={megaCode} 
                onChange={e => setMegaCode(e.target.value)} 
                className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-center tracking-widest font-mono" 
                autoFocus 
              />
              {megaErr && <p className="text-xs text-red-400 text-center">{megaErr}</p>}
              <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm py-3 rounded-full mt-1 transition">
                Unlock Publishing HQ
              </button>
            </form>
            <button onClick={() => setMegaPasscodeOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-bold">✕</button>
          </div>
        </div>
      )}
    </>
  );
}

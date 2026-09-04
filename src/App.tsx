import { useEffect, useRef, useState } from 'react';
import type { Book } from './types';
import { MEGA_ADMIN_PASSCODE_KEY, MEGA_ADMIN_DEFAULT } from './types';
import { loadBooks, saveBooks } from './storage';
import { getEffectiveDbUrl, isSyncEnabled, pullFromCloud, schedulePush, getLastSync } from './cloud';
import MegaAdmin from './components/MegaAdmin';
import BookAdmin from './components/BookAdmin';
import BookLanding from './components/BookLanding';
import BookCover from './components/BookCover';

// ─── Default "Small Business Sales Playbook" seeded on first load ───
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

type ViewMode =
  | { type: 'landing'; book: Book }
  | { type: 'book-admin'; book: Book }
  | { type: 'mega-admin' }
  | { type: 'none' };

function parseHash(): { bookSlug?: string; admin?: boolean; megaAdmin?: boolean; bookAdmin?: string } {
  const raw = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
  if (raw === 'admin' || raw === 'admin/login') return { megaAdmin: true };
  if (raw.startsWith('admin/book/')) return { bookAdmin: raw.replace('admin/book/', '') };
  if (raw.startsWith('book/')) return { bookSlug: raw.replace('book/', '') };
  return {};
}

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    const stored = loadBooks();
    if (stored.length === 0) {
      saveBooks([SEED_BOOK]);
      return [SEED_BOOK];
    }
    return stored;
  });

  const [view, setView] = useState<ViewMode>({ type: 'none' });
  const [megaPasscodeOpen, setMegaPasscodeOpen] = useState(false);
  const [megaCode, setMegaCode] = useState('');
  const [megaErr, setMegaErr] = useState('');
  const [megaPasscode, setMegaPasscode] = useState(() => {
    try { return localStorage.getItem(MEGA_ADMIN_PASSCODE_KEY) || MEGA_ADMIN_DEFAULT; }
    catch { return MEGA_ADMIN_DEFAULT; }
  });
  const [cloudState, setCloudState] = useState<{ syncing: boolean; error: string | null; lastSync: string | null }>({
    syncing: false, error: null, lastSync: getLastSync(),
  });
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial cloud pull: if sync is configured, cloud wins over seed ──
  useEffect(() => {
    (async () => {
      try {
        const url = getEffectiveDbUrl();
        if (!url || !isSyncEnabled()) return;
        setCloudState(s => ({ ...s, syncing: true, error: null }));
        const cloud = await pullFromCloud(url);
        if (cloud && (cloud.books.length > 0 || cloud.leads.length > 0)) {
          if (cloud.books.length > 0) {
            setBooks(cloud.books);
            saveBooks(cloud.books);
          }
          if (cloud.leads.length > 0) {
            try {
              const { LEADS_STORAGE_KEY } = await import('./types');
              localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(cloud.leads));
            } catch { /* */ }
          }
          try {
            const { CLOUD_LAST_SYNC_KEY } = await import('./types');
            localStorage.setItem(CLOUD_LAST_SYNC_KEY, new Date().toISOString());
          } catch { /* */ }
          setCloudState({ syncing: false, error: null, lastSync: new Date().toISOString() });
        } else {
          setCloudState(s => ({ ...s, syncing: false }));
        }
      } catch (e) {
        setCloudState(s => ({ ...s, syncing: false, error: e instanceof Error ? e.message : 'Cloud sync failed' }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll cloud every 45s so edits from another browser appear ──
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const url = getEffectiveDbUrl();
        if (!url || !isSyncEnabled()) return;
        const cloud = await pullFromCloud(url);
        if (cloud && cloud.books.length > 0) {
          setBooks(prev => {
            const a = JSON.stringify(prev);
            const b = JSON.stringify(cloud.books);
            if (a !== b) {
              saveBooks(cloud.books);
              return cloud.books;
            }
            return prev;
          });
        }
      } catch { /* silent poll */ }
    }, 45000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hash-based routing
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
        }
        return;
      }

      if (parsed.bookSlug) {
        const book = books.find(b => b.slug === parsed.bookSlug && b.published);
        if (book) {
          setView({ type: 'landing', book });
        } else {
          setView({ type: 'none' });
        }
        return;
      }

      // Default: always show the hub (book collection page)
      setView({ type: 'none' });
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [books]);

  const handleBooksChange = (updated: Book[]) => {
    setBooks(updated);
    saveBooks(updated);
    // Push to cloud (debounced) so other browsers receive the change
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => { schedulePush(500); }, 300);
  };

  const handleMegaPasscodeChanged = (next: string) => {
    setMegaPasscode(next);
  };

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

  // Determine what to render
  const renderMain = () => {
    if (view.type === 'mega-admin') {
      return (
        <MegaAdmin
          books={books}
          onBooksChange={handleBooksChange}
          onEditBook={book => setView({ type: 'book-admin', book })}
          onViewLanding={book => {
            window.location.hash = `/book/${book.slug}`;
          }}
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
        <BookLanding
          book={view.book}
          onAdminAccess={() => setView({ type: 'book-admin', book: view.book })}
        />
      );
    }

    // No book / no hash — show hub page (book collection)
    const publishedBooks = books.filter(b => b.published);
    return (
      <div className="min-h-screen bg-[#F7F5EF] text-[#1C1B1F] font-[Inter] flex flex-col">
        {/* Hero */}
        <section className="bg-[#152447] px-6 pt-16 pb-28 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(201,162,39,0.08),transparent_70%)]" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-[#0D1830] font-black text-lg font-[Space_Grotesk]">N</div>
              <span className="font-[JetBrains_Mono] text-[11px] tracking-[2.4px] uppercase text-[#C9A227]">Nexa Growth Studio</span>
            </div>
            <h1 className="font-[Space_Grotesk] font-bold text-[30px] md:text-[42px] text-white max-w-[640px] mx-auto leading-[1.18]">
              Books & Guides for Nigerian Business Owners
            </h1>
            <p className="text-[15px] md:text-[16px] text-[#C7CCDA] max-w-[480px] mx-auto mt-5 leading-[1.65]">
              Practical, no-fluff resources to help you grow your sales, build your brand, and scale your business.
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className="font-[JetBrains_Mono] text-[10px] tracking-wider text-slate-400">{publishedBooks.length} {publishedBooks.length === 1 ? 'BOOK' : 'BOOKS'} AVAILABLE</span>
            </div>
          </div>
        </section>

        {/* Book Collection Grid */}
        <main className="max-w-[880px] mx-auto px-6 -mt-16 relative z-10 pb-16 flex-1">
          {publishedBooks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-[rgba(21,36,71,0.08)] shadow-sm">
              <span className="text-5xl">📚</span>
              <p className="mt-4 text-[#6B6860] text-lg">No books published yet.</p>
              <p className="text-sm text-[#6B6860] mt-1">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedBooks.map(book => (
                <a
                  key={book.id}
                  href={`#/book/${book.slug}`}
                  className="group bg-white border border-[rgba(21,36,71,0.08)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 no-underline text-[#1C1B1F] flex flex-col"
                >
                  {/* Cover area */}
                  <div className="bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center py-8 px-6">
                    <BookCover book={book} size="md" rotate className="group-hover:rotate-0 group-hover:scale-105 transition-all duration-300" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${book.type === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {book.type === 'free' ? '🆓 Free' : `💰 ${book.payment?.currency || '₦'}${book.payment?.price?.toLocaleString()}`}
                      </span>
                    </div>
                    <h3 className="font-[Space_Grotesk] font-bold text-[16px] leading-snug mb-2">{book.title}</h3>
                    <p className="text-[12.5px] text-[#6B6860] leading-relaxed line-clamp-3 flex-1">{book.subtitle}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(21,36,71,0.06)]">
                      <span className="font-[JetBrains_Mono] text-[10px] text-[#6B6860] uppercase tracking-wider">{book.author}</span>
                      <span className="text-[12px] text-[#C9A227] font-bold group-hover:translate-x-1 transition-transform duration-200">Get →</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center pb-8 pt-6 border-t border-[rgba(21,36,71,0.08)] px-6">
          <div className="font-[Space_Grotesk] font-semibold text-[14px]">Olakunle Samuel</div>
          <div className="font-[JetBrains_Mono] text-[10px] tracking-[0.6px] text-[#6B6860] uppercase mt-[3px]">Nexa Growth Studio — Ibadan, Nigeria</div>
          <div className="font-[JetBrains_Mono] text-[9px] tracking-wider text-slate-400 mt-2">
            {cloudState.syncing ? '☁️ Syncing…' : cloudState.error ? `☁️ Sync off (${cloudState.error.slice(0, 60)})` : cloudState.lastSync ? `☁️ Synced ${new Date(cloudState.lastSync).toLocaleString()}` : '📱 Showing this device only — enable Cloud Sync in Settings'}
          </div>
        </footer>
      </div>
    );
  };

  return (
    <>
      {renderMain()}

      {/* ── Mega Admin Passcode Modal ── */}
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

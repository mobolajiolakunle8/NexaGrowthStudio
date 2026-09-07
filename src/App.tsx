import { useEffect, useMemo, useState } from 'react';
import type { Book } from './types';
import { loadBooks, saveBooks, saveLeads } from './storage';
import type { AdminSession } from './cloud';
import {
  loginAdmin,
  logoutAdmin,
  observeAdminSession,
  saveBooksToCloud,
  subscribeAdminData,
  subscribePublicBooks,
  testConnection,
} from './cloud';
import MegaAdmin from './components/MegaAdmin';
import BookAdmin from './components/BookAdmin';
import BookLanding from './components/BookLanding';
import BookCover from './components/BookCover';

const SEED_BOOK: Book = {
  id: 'seed_sbsp_001',
  slug: 'small-business-sales-playbook',
  title: 'The Small Business Sales Playbook',
  subtitle: 'A practical, no-fluff guide to closing more sales and growing your business, written for Nigerian small business owners.',
  author: 'Olakunle Samuel',
  authorRole: 'Nexa Growth Studio - Ibadan, Nigeria',
  kicker: 'Free Guide - No Strings Attached',
  type: 'free',
  whatsInside: [
    'A simple framework for understanding your ideal customer and speaking directly to their needs.',
    'Proven sales conversation scripts tailored for Nigerian market dynamics, not generic templates.',
    'How to close deals confidently without being pushy, with practical guidance for everyday business.',
  ],
  ctaTitle: 'Get your free copy',
  ctaSubtitle: 'Enter your details. The guide is delivered to you immediately.',
  adminWhatsapp: '+2349030192034',
  published: true,
  createdAt: new Date().toISOString(),
  donation: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    thankYouMessage: 'Thank you for downloading The Small Business Sales Playbook. We hope it transforms your sales and helps you grow your business.',
    donationMessage: 'Support our work by donating any amount you wish.',
  },
};

type ViewMode =
  | { type: 'landing'; book: Book }
  | { type: 'book-admin'; book: Book }
  | { type: 'mega-admin' }
  | { type: 'hub' };

function parseHash() {
  const raw = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
  if (raw === 'admin' || raw === 'admin/login') return { megaAdmin: true };
  if (raw.startsWith('admin/book/')) return { bookAdmin: raw.replace('admin/book/', '') };
  if (raw.startsWith('book/')) return { bookSlug: raw.replace('book/', '') };
  return {};
}

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => loadBooks().length ? loadBooks() : [SEED_BOOK]);
  const [view, setView] = useState<ViewMode>({ type: 'hub' });
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [pendingBookAdmin, setPendingBookAdmin] = useState<string | null>(null);
  const [cloudOnline, setCloudOnline] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    saveBooks(books);
  }, [books]);

  useEffect(() => {
    if (session) return;
    const stopPublic = subscribePublicBooks(
      remoteBooks => {
        if (remoteBooks.length) {
          setBooks(remoteBooks);
          setCloudOnline(true);
          setLastSync(new Date().toISOString());
        }
      },
      () => setCloudOnline(false),
    );
    testConnection().then(result => setCloudOnline(result.ok));
    return stopPublic;
  }, [session]);

  useEffect(() => observeAdminSession(next => {
    setSession(next);
    setAuthReady(true);
  }), []);

  useEffect(() => {
    if (!session) return;
    return subscribeAdminData(
      payload => {
        if (payload.books.length) setBooks(payload.books);
        saveLeads(payload.leads);
        setLastSync(new Date().toISOString());
      },
      error => setLoginError(error.message),
    );
  }, [session]);

  useEffect(() => {
    const route = () => {
      const parsed = parseHash();
      if (parsed.megaAdmin) {
        if (session) setView({ type: 'mega-admin' });
        else if (authReady) setLoginOpen(true);
        return;
      }
      if (parsed.bookAdmin) {
        if (session) {
          const book = books.find(item => item.slug === parsed.bookAdmin);
          if (book) setView({ type: 'book-admin', book });
        } else if (authReady) {
          setPendingBookAdmin(parsed.bookAdmin);
          setLoginOpen(true);
        }
        return;
      }
      if (parsed.bookSlug) {
        const book = books.find(item => item.slug === parsed.bookSlug && item.published);
        setView(book ? { type: 'landing', book } : { type: 'hub' });
        return;
      }
      setView({ type: 'hub' });
    };
    route();
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, [authReady, books, session]);

  const publishedBooks = useMemo(() => books.filter(book => book.published), [books]);

  const updateBooks = async (updated: Book[]) => {
    setBooks(updated);
    saveBooks(updated);
    try {
      await saveBooksToCloud(updated);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not save changes to Firebase.');
    }
  };

  const updateBook = (updated: Book) => {
    void updateBooks(books.map(book => book.id === updated.id ? updated : book));
    setView({ type: 'book-admin', book: updated });
  };

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError('');
    try {
      const next = await loginAdmin(loginEmail, loginPassword);
      setSession(next);
      setLoginOpen(false);
      setLoginPassword('');
      if (pendingBookAdmin) {
        const book = books.find(item => item.slug === pendingBookAdmin);
        setPendingBookAdmin(null);
        if (book) setView({ type: 'book-admin', book });
      } else {
        setView({ type: 'mega-admin' });
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setLoginBusy(false);
    }
  };

  const signOutAdmin = async () => {
    await logoutAdmin();
    setSession(null);
    window.location.hash = '';
    setView({ type: 'hub' });
  };

  if (view.type === 'mega-admin' && session) {
    return (
      <MegaAdmin
        books={books}
        adminEmail={session.email}
        onBooksChange={updated => void updateBooks(updated)}
        onEditBook={book => setView({ type: 'book-admin', book })}
        onViewLanding={book => { window.location.hash = `/book/${book.slug}`; }}
        onSignOut={() => void signOutAdmin()}
      />
    );
  }

  if (view.type === 'book-admin' && session) {
    return <BookAdmin book={view.book} onUpdateBook={updateBook} onBack={() => setView({ type: 'mega-admin' })} />;
  }

  if (view.type === 'landing') {
    return <BookLanding book={view.book} />;
  }

  return (
    <>
      <div className="min-h-screen bg-[#F7F5EF] text-[#1C1B1F] font-[Inter] flex flex-col">
        <section className="bg-[#152447] px-6 pt-16 pb-28 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 opacity-70" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-[#0D1830] font-black text-lg font-[Space_Grotesk]">N</div>
              <span className="font-[JetBrains_Mono] text-[11px] tracking-[2.4px] uppercase text-[#C9A227]">Nexa Growth Studio</span>
            </div>
            <h1 className="font-[Space_Grotesk] font-bold text-[30px] md:text-[42px] text-white max-w-[640px] mx-auto leading-[1.18]">Books &amp; Guides for Nigerian Business Owners</h1>
            <p className="text-[15px] md:text-[16px] text-[#C7CCDA] max-w-[480px] mx-auto mt-5 leading-[1.65]">Practical resources to help you grow your sales, build your brand, and scale your business.</p>
            <p className="font-[JetBrains_Mono] text-[10px] tracking-wider text-slate-400 mt-6">{publishedBooks.length} {publishedBooks.length === 1 ? 'BOOK' : 'BOOKS'} AVAILABLE</p>
          </div>
        </section>

        <main className="w-full max-w-[880px] mx-auto px-6 -mt-16 relative z-10 pb-16 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedBooks.map(book => (
              <a key={book.id} href={`#/book/${book.slug}`} className="group bg-white border border-[rgba(21,36,71,0.08)] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 no-underline text-[#1C1B1F] flex flex-col">
                <div className="bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center py-8 px-6">
                  <BookCover book={book} size="md" rotate className="group-hover:rotate-0 group-hover:scale-105 transition-all duration-300" />
                </div>
                <div className="flex-1 p-5 flex flex-col">
                  <span className={`self-start text-[10px] font-bold px-2.5 py-1 rounded-full ${book.type === 'free' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {book.type === 'free' ? 'Free' : `${book.payment?.currency || 'N'}${book.payment?.price?.toLocaleString()}`}
                  </span>
                  <h2 className="font-[Space_Grotesk] font-bold text-[16px] leading-snug mt-3 mb-2">{book.title}</h2>
                  <p className="text-[12.5px] text-[#6B6860] leading-relaxed line-clamp-3 flex-1">{book.subtitle}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(21,36,71,0.06)]">
                    <span className="font-[JetBrains_Mono] text-[10px] text-[#6B6860] uppercase tracking-wider">{book.author}</span>
                    <span className="text-[12px] text-[#C9A227] font-bold">View</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </main>

        <footer className="text-center pb-8 pt-6 border-t border-[rgba(21,36,71,0.08)] px-6">
          <div className="font-[Space_Grotesk] font-semibold text-[14px]">Olakunle Samuel</div>
          <div className="font-[JetBrains_Mono] text-[10px] tracking-[0.6px] text-[#6B6860] uppercase mt-1">Nexa Growth Studio - Ibadan, Nigeria</div>
          <div className={`font-[JetBrains_Mono] text-[9px] mt-2 ${cloudOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
            {cloudOnline ? `Cloud sync active${lastSync ? ` - ${new Date(lastSync).toLocaleString()}` : ''}` : 'Connecting to Firebase...'}
          </div>
        </footer>
      </div>

      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6" onClick={() => setLoginOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-8 max-w-sm w-full shadow-2xl relative" onClick={event => event.stopPropagation()}>
            <h2 className="font-[Space_Grotesk] text-lg font-bold text-amber-400 mb-1">Nexa Admin</h2>
            <p className="text-xs text-slate-400 mb-5">Sign in with the Firebase administrator account.</p>
            <form onSubmit={submitLogin} className="flex flex-col gap-3">
              <input required type="email" autoComplete="username" placeholder="Admin email" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
              <input required type="password" autoComplete="current-password" placeholder="Password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
              {loginError && <p className="text-xs text-red-400">{loginError}</p>}
              <button disabled={loginBusy} type="submit" className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm py-3 rounded-full transition">{loginBusy ? 'Signing in...' : 'Sign In'}</button>
            </form>
            <button onClick={() => setLoginOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300" aria-label="Close">x</button>
          </div>
        </div>
      )}
    </>
  );
}
import { useEffect, useState, useCallback } from 'react';
import type { Book, Lead, SiteSettings } from './types';
import {
  MEGA_ADMIN_PASSCODE_KEY,
  MEGA_ADMIN_DEFAULT,
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_STORAGE_KEY,
} from './types';
import { loadBooks, saveBooks } from './storage';
import {
  autoSyncBooks,
  saveSiteSettingsToCloud,
  bootstrapCloud,
  startLiveSync,
  stopLiveSync,
  testConnection,
} from './cloud';
import MegaAdmin from './components/MegaAdmin';
import BookAdmin from './components/BookAdmin';
import BookLanding from './components/BookLanding';
import PublishingHome from './components/PublishingHome';
import GeneralPressHome from './components/GeneralPressHome';

function parseHash(): {
  bookSlug?: string;
  megaAdmin?: boolean;
  bookAdmin?: string;
  isGeneralPress?: boolean;
} {
  const raw = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
  if (raw === 'admin' || raw === 'admin/login') return { megaAdmin: true };
  if (raw === 'general' || raw.startsWith('general/')) return { isGeneralPress: true };
  if (raw.startsWith('admin/book/')) return { bookAdmin: raw.replace('admin/book/', '') };
  if (raw.startsWith('book/')) return { bookSlug: raw.replace('book/', '') };
  return {};
}

const SEED_BOOK: Book = {
  id: 'seed_sbsp_001',
  slug: 'small-business-sales-playbook',
  title: 'The Small Business Sales Playbook',
  subtitle: 'A practical, no-fluff guide to closing more sales and growing your business — written for Nigerian small business owners.',
  author: 'Olakunle Samuel',
  authorRole: 'Founder & Publisher',
  kicker: 'Free Business Playbook',
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
    donationMessage: 'Support our mission — donate any amount you wish.',
  },
};

type ViewMode =
  | { type: 'landing'; book: Book }
  | { type: 'book-admin'; book: Book }
  | { type: 'mega-admin' }
  | { type: 'general-press' }
  | { type: 'none' };

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

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const raw = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_SITE_SETTINGS;
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

  // ── Live sync across all browsers (books, leads, and siteSettings) ──
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = startLiveSync((fbooks: Book[], _fleads: Lead[], fsettings: SiteSettings) => {
        if (Array.isArray(fbooks)) {
          setBooks(fbooks);
          saveBooks(fbooks);
        }
        if (fsettings) {
          setSiteSettings(fsettings);
          try { localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(fsettings)); } catch { /* ignore */ }
        }
      });
    } catch (err) {
      console.warn('Realtime live sync error fallback:', err);
    }

    testConnection().catch(() => {});

    return () => {
      if (unsubscribe) unsubscribe();
      stopLiveSync();
    };
  }, []);

  // ── First-load reconciliation ──
  useEffect(() => {
    void (async () => {
      try {
        const localBooks = loadBooks();
        const cloud = await bootstrapCloud(localBooks.length ? localBooks : [SEED_BOOK]);
        setBooks(cloud.books);
        saveBooks(cloud.books);
        if (cloud.settings) {
          setSiteSettings(cloud.settings);
        }
      } catch (error) {
        console.error('Cloud bootstrap failed; using local catalog:', error);
      }
    })();
  }, []);

  // ── Hash routing ──
  useEffect(() => {
    const handleHash = () => {
      const parsed = parseHash();
      if (parsed.megaAdmin) {
        setMegaPasscodeOpen(true);
        return;
      }
      if (parsed.isGeneralPress) {
        setView({ type: 'general-press' });
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

  const handleBooksChange = useCallback((updated: Book[]) => {
    setBooks(updated);
    saveBooks(updated);
    autoSyncBooks(updated).catch(() => {});
  }, []);

  const handleSettingsChange = useCallback(async (updated: SiteSettings) => {
    setSiteSettings(updated);
    try { localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
    await saveSiteSettingsToCloud(updated);
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
          settings={siteSettings}
          onBooksChange={handleBooksChange}
          onSettingsChange={handleSettingsChange}
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
          officialEmail={siteSettings.officialEmail}
          onUpdateBook={handleUpdateBook}
          onBack={() => setView({ type: 'mega-admin' })}
        />
      );
    }
    if (view.type === 'landing') {
      return (
        <BookLanding book={view.book} settings={siteSettings} onAdminAccess={() => setView({ type: 'book-admin', book: view.book })} />
      );
    }

    if (view.type === 'general-press') {
      return <GeneralPressHome books={books} settings={siteSettings} />;
    }

    return <PublishingHome books={books} settings={siteSettings} />;
  };

  return (
    <>
      {renderMain()}

      {megaPasscodeOpen && (
        <div className="fixed inset-0 z-50 bg-[#0E1420]/80 backdrop-blur-sm flex items-center justify-center px-6" onClick={() => setMegaPasscodeOpen(false)}>
          <div className="bg-[#0E1420] border border-[#C8862A]/30 text-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#C8862A] text-slate-950 font-black text-sm w-8 h-8 rounded-xl flex items-center justify-center font-[Space_Grotesk]">N</span>
              <h3 className="font-[Space_Grotesk] text-lg font-bold text-white">Publishing HQ Access</h3>
            </div>
            <p className="text-xs text-white/60 mb-5">Enter the executive passcode to unlock the studio console.</p>
            <form onSubmit={handleMegaLogin} className="flex flex-col gap-3">
              <input 
                required 
                type="password" 
                placeholder="Enter passcode" 
                value={megaCode} 
                onChange={e => setMegaCode(e.target.value)} 
                className="bg-white/5 border border-white/15 px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-[#C8862A] text-center tracking-widest font-mono" 
                autoFocus 
              />
              {megaErr && <p className="text-xs text-red-400 text-center">{megaErr}</p>}
              <button type="submit" className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs py-3 rounded-full mt-1 transition font-[JetBrains_Mono] uppercase tracking-wider">
                Unlock HQ Console
              </button>
            </form>
            <button onClick={() => setMegaPasscodeOpen(false)} className="absolute top-5 right-5 text-white/40 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </>
  );
}

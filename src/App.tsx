import { useEffect, useState, useCallback } from 'react';
import type { Book, Lead, SiteSettings } from './types';
import {
  MEGA_ADMIN_PASSCODE_KEY,
  MEGA_ADMIN_DEFAULT,
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_STORAGE_KEY,
  SUPER_ADMIN_PASSCODE_KEY,
  SUPER_ADMIN_DEFAULT,
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
import DeveloperScreen from './components/DeveloperScreen';
import SuperAdmin from './components/SuperAdmin';

type Route =
  | { name: 'home' }
  | { name: 'landing'; slug: string }
  | { name: 'book-admin'; slug: string }
  | { name: 'mega-admin' }
  | { name: 'super-admin' };

function parseHash(): Route {
  const raw = window.location.hash.toLowerCase().replace(/^#\/?/, '').replace(/\/+$/, '');
  if (raw === 'admin' || raw === 'admin/login') return { name: 'mega-admin' };
  if (raw === 'super' || raw.startsWith('super/')) return { name: 'super-admin' };
  if (raw.startsWith('admin/book/')) return { name: 'book-admin', slug: raw.replace('admin/book/', '') };
  if (raw.startsWith('book/')) return { name: 'landing', slug: raw.replace('book/', '') };
  return { name: 'home' };
}

const SEED_BOOK: Book = {
  id: 'seed_sbsp_001',
  slug: 'small-business-sales-book',
  title: 'The Small Business Sales Book',
  subtitle: 'A practical, no-fluff guide to closing more sales and growing your business — written for Nigerian small business owners.',
  author: 'Olakunle Samuel',
  authorRole: 'Founder & Publisher',
  kicker: 'Free Book Edition',
  type: 'free',
  whatsInside: [
    'A simple framework for understanding your ideal customer and speaking directly to their needs.',
    'Proven sales conversation scripts tailored for Nigerian market dynamics — no generic templates.',
    'How to close deals confidently without being pushy — practical guidance for everyday business.',
  ],
  ctaTitle: 'Get your free copy',
  ctaSubtitle: 'Enter your details. The book is delivered to you immediately.',
  adminWhatsapp: '+2349030192034',
  adminPasscode: 'admin123',
  published: true,
  createdAt: new Date().toISOString(),
  donation: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    thankYouMessage: 'Thank you for downloading The Small Business Sales Book! We hope it transforms your sales and helps you grow the business you deserve. If this guide added value, please consider supporting our work so we can keep creating free resources for Nigerian business owners.',
    donationMessage: 'Support our mission — donate any amount you wish.',
  },
};

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const stored = loadBooks();
      if (stored.length) return stored;
    } catch (e) {
      console.warn('Local catalog unavailable; seeding', e);
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

  const [route, setRoute] = useState<Route>({ name: 'home' });

  const [megaCode, setMegaCode] = useState('');
  const [megaErr, setMegaErr] = useState('');
  const [megaPasscode, setMegaPasscode] = useState<string>(() => {
    try {
      return localStorage.getItem(MEGA_ADMIN_PASSCODE_KEY) ?? MEGA_ADMIN_DEFAULT;
    } catch {
      return MEGA_ADMIN_DEFAULT;
    }
  });

  const [megaAuthed, setMegaAuthed] = useState(false);
  const [superPasscode] = useState<string>(() => {
    try {
      return localStorage.getItem(SUPER_ADMIN_PASSCODE_KEY) ?? SUPER_ADMIN_DEFAULT;
    } catch {
      return SUPER_ADMIN_DEFAULT;
    }
  });

  // ── Realtime sync (catalog, leads, settings) ──
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = startLiveSync((cloudBooks: Book[], _leads: Lead[], cloudSettings: SiteSettings) => {
        if (Array.isArray(cloudBooks)) {
          setBooks(cloudBooks);
          saveBooks(cloudBooks);
        }
        if (cloudSettings) {
          setSiteSettings(cloudSettings);
          try { localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(cloudSettings)); } catch { /* ignore */ }
        }
      });
    } catch (err) {
      console.warn('Realtime sync unavailable:', err);
    }

    testConnection().catch(() => {});

    return () => {
      if (unsubscribe) unsubscribe();
      stopLiveSync();
    };
  }, []);

  // ── First-load reconciliation with the cloud ──
  useEffect(() => {
    void (async () => {
      try {
        const localBooks = loadBooks();
        const cloud = await bootstrapCloud(localBooks.length ? localBooks : [SEED_BOOK]);
        setBooks(cloud.books);
        saveBooks(cloud.books);
        if (cloud.settings) setSiteSettings(cloud.settings);
      } catch (error) {
        console.error('Cloud bootstrap failed; using local catalog:', error);
      }
    })();
  }, []);

  // ── Routing ──
  useEffect(() => {
    const handleHash = () => setRoute(parseHash());
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

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
    handleBooksChange(books.map(b => (b.id === updated.id ? updated : b)));
    setRoute({ name: 'book-admin', slug: updated.slug });
  };

  const handleMegaLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (megaCode === megaPasscode) {
      setMegaAuthed(true);
      setMegaCode('');
      setMegaErr('');
    } else {
      setMegaErr('Incorrect passcode.');
    }
  };

  const gotoHome = () => { window.location.hash = ''; };

  /* ── Site gating ──
     The public sees a maintenance screen when the site is deactivated or in
     developer mode. The Super Admin console lets the publisher preview it. */
  const siteActive = siteSettings.siteActive !== false;
  const siteDev = siteSettings.siteDeveloper === true;
  const devPreview = sessionStorage.getItem('nexa_dev_preview') === '1';

  const renderMain = () => {
    // Super Admin console
    if (route.name === 'super-admin') {
      return (
        <SuperAdmin
          settings={siteSettings}
          superPasscode={superPasscode}
          onSettingsChange={handleSettingsChange}
          onExit={gotoHome}
        />
      );
    }

    // Mega Admin (content management)
    if (route.name === 'mega-admin') {
      if (!megaAuthed) {
        return (
          <div className="grid min-h-screen place-items-center px-6 font-[Inter]" style={{ background: '#0E1420' }}>
            <div className="w-full max-w-sm rounded-3xl border border-[#C8862A]/30 p-8 text-white">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="grid h-9 w-9 place-items-center rounded-xl font-[Space_Grotesk] text-sm font-black" style={{ background: '#C8862A', color: '#0E1420' }}>N</span>
                <h3 className="font-[Space_Grotesk] text-lg font-bold">Publishing HQ Access</h3>
              </div>
              <p className="mb-5 text-xs text-white/60">Enter the admin passcode to edit books and front-page content.</p>
              <form onSubmit={handleMegaLogin} className="flex flex-col gap-3">
                <input
                  required
                  type="password"
                  placeholder="Enter passcode"
                  value={megaCode}
                  onChange={e => setMegaCode(e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center font-mono text-sm tracking-widest text-white focus:border-[#C8862A] focus:outline-none"
                  autoFocus
                />
                {megaErr && <p className="text-center text-xs text-red-400">{megaErr}</p>}
                <button type="submit" className="rounded-full bg-[#C8862A] py-3 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-wider text-[#0E1420] transition-transform hover:scale-[1.02]">
                  Unlock Admin Console
                </button>
              </form>
              <button onClick={gotoHome} className="mt-5 w-full font-[JetBrains_Mono] text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70">
                ← Back to website
              </button>
            </div>
          </div>
        );
      }
      return (
        <MegaAdmin
          books={books}
          settings={siteSettings}
          onBooksChange={handleBooksChange}
          onSettingsChange={handleSettingsChange}
          onEditBook={book => setRoute({ name: 'book-admin', slug: book.slug })}
          onViewLanding={book => { window.location.hash = `/book/${book.slug}`; }}
          megaPasscode={megaPasscode}
          onMegaPasscodeChanged={setMegaPasscode}
        />
      );
    }

    // Book-level admin
    if (route.name === 'book-admin') {
      const book = books.find(b => b.slug === route.slug);
      if (!book) return <NotFound onBack={gotoHome} />;
      return (
        <BookAdmin
          book={book}
          officialEmail={siteSettings.officialEmail}
          siteSettings={siteSettings}
          onUpdateBook={handleUpdateBook}
          onBack={() => setRoute({ name: 'mega-admin' })}
        />
      );
    }

    // Individual book landing page
    if (route.name === 'landing') {
      const book = books.find(b => b.slug === route.slug);
      if (!book) return <NotFound onBack={gotoHome} />;
      return (
        <BookLanding
          book={book}
          settings={siteSettings}
          onAdminAccess={() => setRoute({ name: 'book-admin', slug: book.slug })}
        />
      );
    }

    // Home (single publishing-house website)
    if (!devPreview && !siteActive) {
      return (
        <DeveloperScreen
          siteName={siteSettings.studioName}
          notice="This website is temporarily unavailable. Please check back soon."
          onExit={gotoHome}
        />
      );
    }
    if (!devPreview && siteDev) {
      return (
        <DeveloperScreen
          siteName={siteSettings.studioName}
          notice={siteSettings.developerNotice || DEFAULT_SITE_SETTINGS.developerNotice!}
          onExit={gotoHome}
        />
      );
    }

    return <PublishingHome books={books} settings={siteSettings} />;
  };

  return <>{renderMain()}</>;
}

function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center font-[Inter]" style={{ background: '#0E1420' }}>
      <div>
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.28em]" style={{ color: '#C8862A' }}>404</p>
        <h1 className="mt-3 font-[Space_Grotesk] text-2xl font-bold text-white">That page has moved</h1>
        <button
          onClick={onBack}
          className="mt-6 rounded-full bg-[#C8862A] px-6 py-3 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E1420]"
        >
          ← Back to website
        </button>
      </div>
    </div>
  );
}

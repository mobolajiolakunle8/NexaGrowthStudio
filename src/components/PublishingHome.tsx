import { useEffect, useState, useMemo } from 'react';
import type { Book, SiteSettings } from '../types';
import BookCover from './BookCover';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';

import {
  ArrowRight,
  BookOpen,
  Search,
  Sparkles,
  TrendingUp,
  Star,
  HelpCircle,
  ChevronRight,
  MessageCircle,
  Mail,
} from 'lucide-react';

interface Props {
  books: Book[];
  settings: SiteSettings;
}

const THEME_KEY = 'nexa_public_theme';

export default function PublishingHome({ books, settings }: Props) {
  const published = books.filter(book => book.published !== false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { }
    return settings.defaultTheme || 'light';
  });

  const [query, setQuery] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [pinnedBookSlug] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState(0);
  const [lostEmail, setLostEmail] = useState('');
  const [lostStatus, setLostStatus] = useState<'idle' | 'sent' | 'error' | 'notFound'>('idle');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved !== 'light' && saved !== 'dark') setTheme(settings.defaultTheme || 'light');
    } catch { }
  }, [settings.defaultTheme]);

  const dark = theme === 'dark';
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { }
  };

  const { filteredBooks, featuredBook } = useMemo(() => {
    let base = published.slice();
    if (pinnedBookSlug && books.find(b => b.slug === pinnedBookSlug)) {
      const idx = base.findIndex(b => b.slug === pinnedBookSlug);
      if (idx > 0) base.unshift(base.splice(idx, 1)[0]);
    }
    let filtered = base;
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q)
      );
    }
    if (showFreeOnly) filtered = filtered.filter(b => b.type === 'free');
    return { filteredBooks: filtered, featuredBook: base[0] || undefined };
  }, [books, published, query, showFreeOnly, pinnedBookSlug]);

  const FAQ_ITEMS = [
    { q: 'How do I get my book after paying?', a: 'I send the direct download link to your WhatsApp number instantly after confirmation. Delivery is always within a few minutes.' },
    { q: 'What if I lose the download link?', a: 'Contact support. Your purchase record is stored and the link can resend for free whenever you need it.' },
    { q: 'Is my payment secure?', a: 'All transfers are handled by You and confirmed directly by Olakunle Samuel at Nexa Growth Studio.' },
    { q: 'Do I get updates?', a: 'Yes. Existing readers get a courtesy download link when a book is updated.' },
  ];

  const DEFAULT_TESTIMONIALS = [
    { id: 't1', name: 'Chinwe O.', role: 'Founder', location: 'Lagos', message: 'Sales guide that finally stopped me discounting. Closed two contracts on Monday after finishing Sunday.', rating: 5 },
    { id: 't2', name: 'Tunde A.', role: 'Operations Mgr', location: 'Ibadan', message: 'Execution-focused, not filler. Finished on Sunday, applied next Monday.', rating: 5 },
  ];

  function handleLostLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lostEmail.trim()) return;
    setLostStatus('error');
    setTimeout(() => {
      const waText = encodeURIComponent(
        `Hi Nexa Growth Studio, I need help retrieving my paid-book download.\n\nEmail used: ${lostEmail.trim()}\nBook: ${featuredBook?.title || 'my order'}.\n\nPlease resend my download link.`
      );
      window.open(`https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}?text=${waText}`, '_blank', 'noopener,noreferrer');
      setLostStatus('sent');
    }, 900);
  }

  const navLinks: Array<[string, string, string]> = [
    [settings.navCatalogueLabel, '#catalogue', 'Catalogue'],
    [settings.navManifestoLabel, '#standard', 'Standard'],
    [settings.navFounderLabel, '#founder', 'Founder'],
  ];

  const darkCls = dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]';
  const panelCls = dark ? 'border-white/10 bg-white/[0.045]' : 'border-[#0E1420]/10 bg-white';
  const mutedCls = dark ? 'text-white/65' : 'text-[#0E1420]/75';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-700 ${darkCls}`}>
      {/* Mobile Navigation Drawer */}
      <MobileNav settings={settings} navLinks={navLinks} currentPath="/" theme={theme} onToggleTheme={toggleTheme} />

      {/* Cross-Site Link Bar */}
      {settings.generalBooksUrl ? (
        <div className={`border-b px-5 py-2.5 ${dark ? 'border-white/10 bg-black/30' : 'border-[#0E1420]/10 bg-[#0E1420] text-white'}`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.18em] opacity-70">Independent publishing from {settings.location}</p>
            <a href={settings.generalBooksUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.13em] text-white no-underline transition-colors hover:bg-white hover:text-[#0E1420]">
              {settings.generalBooksLabel || 'General Books'} <ArrowRight size={11} />
            </a>
          </div>
        </div>
      ) : null}

      {/* Sticky Masthead */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all ${dark ? 'border-white/10 bg-[#090D15]/92' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${mutedCls}`}>{settings.studioTagline}</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {['Home', 'Catalogue', 'Standard', 'Founder'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline hover:text-[#C8862A] transition-colors ${mutedCls}`}>{item}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <a href="#catalogue" className="hidden rounded-full bg-[#C8862A] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] text-[#0E1420] no-underline transition-transform hover:-translate-y-0.5 sm:inline-flex">Browse books</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`relative overflow-hidden border-b ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#C8862A]/15 blur-[110px]" />
        <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-[#4F6B52]/10 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 md:grid-cols-[1.14fr_0.86fr] md:py-24">
          <div className="relative z-10 animate-fade-up">
            <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">{settings.heroKicker}</p>
            {settings.heroBadgeText ? (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  background: dark ? 'rgba(200,134,42,0.1)' : 'rgba(200,134,42,0.08)',
                  color: dark ? '#E0B27A' : '#8A5B18',
                  borderColor: dark ? 'rgba(200,134,42,0.3)' : 'rgba(200,134,42,0.2)'
                }}
              >
                <Sparkles size={11} /> {settings.heroBadgeText}
              </span>
            ) : null}
            <h1 className="mt-5 max-w-3xl font-[Space_Grotesk] text-[39px] font-bold leading-[1.02] tracking-[-0.035em] md:text-[64px]">{settings.heroTitle}</h1>
            <p className={`mt-6 max-w-xl text-[15.5px] leading-[1.75] md:text-[16.5px] ${mutedCls}`}>{settings.heroSubtitle}</p>
            <div className="mt-10 flex flex-wrap gap-3.5">
              <a href="#catalogue" className="group rounded-full bg-[#0E1420] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:bg-[#16223A]">
                {settings.heroPrimaryCta}
                <ArrowRight size={13} className="ml-1.5 inline-block group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#founder" className="rounded-full border px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-colors hover:border-[#C8862A]"
                style={{
                  borderColor: dark ? 'rgba(255,255,255,0.25)' : 'rgba(14,20,32,0.2)',
                  color: dark ? '#F8F3EA' : '#0E1420'
                }}
              >
                {settings.heroSecondaryCta}
              </a>
            </div>
            <div className={`mt-12 grid max-w-md grid-cols-3 border-t pt-6 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
              {[[String(published.length).padStart(2, '0'), 'Published titles'], ['100%', 'Market relevant'], ['Instant', 'Delivery']].map(([value, label]) => (
                <div key={label}>
                  <p className="font-[Space_Grotesk] text-[26px] font-bold text-[#C8862A]">{value}</p>
                  <p className={`mt-1 font-[JetBrains_Mono] text-[8px] uppercase tracking-[0.14em] ${mutedCls}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto flex items-center justify-center animate-fade-up [animation-delay:140ms]">
            <div className="pointer-events-none absolute h-[330px] w-[330px] rounded-full bg-[#C8862A]/16 blur-3xl" />
            {featuredBook ? (
              <a href={`#/book/${featuredBook.slug}`} className="group relative no-underline">
                <BookCover book={featuredBook} size="lg" rotate className="drop-shadow-2xl transition-all duration-300 group-hover:rotate-0 group-hover:scale-[1.025]" />
                <span className="absolute -right-5 top-7 rounded-full border px-3 py-1.5 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.13em] shadow-xl"
                  style={{
                    background: dark ? 'rgba(25,34,49,0.95)' : 'rgba(250,247,242,0.95)',
                    color: dark ? '#E0B27A' : '#8A5B18',
                    borderColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(14,20,32,0.1)'
                  }}>
                  {featuredBook.type === 'free' ? 'Free edition' : `★ ${featuredBook.payment?.currency || '₦'}${(featuredBook.payment?.price || 0).toLocaleString()}`}
                </span>
              </a>
            ) : (
              <div className="grid h-[330px] w-[230px] place-items-center rounded-2xl border border-dashed text-center" style={{
                borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(14,20,32,0.2)'
              }}>
                <p className="px-7 font-[JetBrains_Mono] text-[10px]" style={{
                  color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(14,20,32,0.45)'
                }}>
                  New titles in production
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Publishing Standard */}
      <section className="py-20 bg-[#0E1420] text-white">
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">{settings.manifestoEyebrow}</p>
          <h2 className="mt-4 max-w-2xl font-[Space_Grotesk] text-[29px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[42px]">{settings.manifestoHeading}</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">
            {settings.manifestoCards.map(card => (
              <article key={`${card.number}-${card.title}`} className="bg-[#0E1420] p-8 transition-colors duration-200 hover:bg-[#121A2A] md:p-9">
                <p className="font-[JetBrains_Mono] text-[11px] font-bold tracking-[0.2em] text-[#C8862A]">{card.number}</p>
                <h3 className="mt-4 font-[Space_Grotesk] text-[19px] font-bold">{card.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.72] text-white/62">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <section id="catalogue" className={`scroll-mt-20 py-20 ${dark ? 'bg-[#090D15]' : 'bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">{settings.catalogueEyebrow}</p>
              <h2 className="mt-3 font-[Space_Grotesk] text-[32px] font-bold tracking-[-0.025em] md:text-[46px]">{settings.catalogueHeading}</h2>
            </div>
            <div className="flex w-full flex-col sm:w-auto sm:min-w-[340px] sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0E1420]/40" style={{ color: dark ? 'rgba(255,255,255,0.4)' : undefined }} />
                <input
                  type="search"
                  placeholder="Search book titles, authors..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full rounded-full border border-[#0E1420]/15 pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-[#C8862A]"
                  style={{
                    background: dark ? 'rgba(0,0,0,0.25)' : 'white',
                    borderColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(14,20,32,0.18)',
                    color: dark ? '#F8F3EA' : '#0E1420'
                  }}
                />
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border px-4 py-3 text-[11px] font-bold"
                style={{
                  borderColor: dark ? 'rgba(255,255,255,0.18)' : '#0E1420/18',
                  background: dark ? 'rgba(0,0,0,0.18)' : '#FAF7F2'
                }}
              >
                <input type="checkbox" checked={showFreeOnly} onChange={e => setShowFreeOnly(e.target.checked)} className="accent-[#C8862A] h-4 w-4 rounded border-slate-600" />
                Only FREE
              </label>
            </div>
          </div>
          {filteredBooks.length ? (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((book, index) => {
                const isPinned = pinnedBookSlug && book.slug === pinnedBookSlug;
                return (
                  <a key={book.id} href={`#/book/${book.slug}`} className={`group flex flex-col overflow-hidden rounded-3xl border no-underline shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${panelCls}`}>
                    <div className={`flex items-center justify-center px-6 py-10 ${dark ? 'bg-[#111824]' : index % 2 ? 'bg-[#EEF0EA]' : 'bg-[#F2EBDD]'} relative`}>
                      {isPinned && (
                        <span className="absolute left-4 top-2 inline-flex items-center gap-1 rounded-full bg-[#C8862A] px-2.5 py-1 font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-wider text-[#0E1420]">
                          <TrendingUp size={10} /> Featured
                        </span>
                      )}
                      <BookCover book={book} size="md" rotate className="transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.035]" />
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full px-2.5 py-1 font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-[0.13em] ${
                          book.type === 'free' ? 'bg-emerald-500/12 text-emerald-500' : 'bg-[#C8862A]/12 text-[#C8862A]'
                        }`}>
                          {book.type === 'free' ? 'Free access' : `₦${(book.payment?.price || 0).toLocaleString()}`}
                        </span>
                        <span className={`font-[JetBrains_Mono] text-[8px] uppercase tracking-[0.14em] ${mutedCls}`}>VOL-{String(index + 1).padStart(3, '0')}</span>
                      </div>
                      <h3 className="mt-4 font-[Space_Grotesk] text-[17px] font-bold leading-snug">{book.title}</h3>
                      <p className={`mt-2 line-clamp-3 flex-1 text-[13px] leading-[1.68] ${mutedCls}`}>{book.subtitle}</p>
                      <div className={`mt-6 flex items-center justify-between border-t pt-4 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
                        <span className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.13em] ${mutedCls}`}>{book.author}</span>
                        <span className="inline-flex items-center gap-1 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">Open book <ArrowRight size={11} /></span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className={`mt-12 rounded-3xl border border-dashed py-20 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}>
              <BookOpen className="mx-auto text-[#C8862A]" />
              <p className="mt-4 font-[Space_Grotesk] text-lg font-bold">{query ? `No books matching "${query}"` : settings.catalogueSummary ? settings.catalogueSummary : 'The shelves are being stocked'}</p>
              {query && (
                <div className="mt-3">
                  <button onClick={() => { setQuery(''); setShowFreeOnly(false); }} className="text-xs font-mono font-semibold uppercase tracking-wider text-[#C8862A] hover:underline">Clear search</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className={`py-20 border-y ${dark ? 'border-white/10 bg-[#101722]' : 'border-[#0E1420]/10 bg-[#F2EBDD]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">Reader Trust</p>
          <h2 className="mt-3 font-[Space_Grotesk] text-[29px] font-bold tracking-[-0.02em] md:text-[39px]">What Business Owners Say</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {DEFAULT_TESTIMONIALS.map(t => (
              <div key={t.id} className={`relative overflow-hidden rounded-3xl border p-7 shadow-xl transition-all duration-300 hover:-translate-y-1.5 ${dark ? 'border-white/10 bg-[#131A27]' : 'border-[#0E1420]/10 bg-white'}`}>
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} size={15} className={star <= t.rating ? 'fill-[#C8862A] text-[#C8862A]' : 'text-[#0E1420]/25'} />
                  ))}
                </div>
                <p className={`text-[15px] leading-[1.75] font-medium ${dark ? 'text-white/85' : 'text-[#0E1420]/80'}`}>
                  “{t.message}”
                </p>
                <div className="mt-6 flex items-center gap-3 border-t pt-6" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(14,20,32,0.08)' }}>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0E1420] font-[Space_Grotesk] font-bold text-white text-sm">OS</span>
                  <div>
                    <p className="font-[Space_Grotesk] text-[14px] font-bold">{t.name}</p>
                    <p className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.13em] ${mutedCls}`}>
                      {t.role ? `${t.role}${t.location ? ' · ' + t.location : ''}` : t.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ & Transaction Support */}
      <section className={`py-20 ${dark ? 'bg-[#090D15]' : 'bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">Transaction Support</p>
          <h2 className="mt-3 font-[Space_Grotesk] text-[29px] font-bold tracking-[-0.02em] md:text-[39px]">Answers Before You Pay</h2>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.12fr_0.88fr]">
            <div className={`rounded-3xl border p-6 md:p-9 shadow-lg ${panelCls}`}>
              {FAQ_ITEMS.map((item, idx) => (
                <div key={item.q} className="border-b last:border-b-0" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(14,20,32,0.1)' }}>
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <div className="flex items-center gap-3.5 py-5">
                      <span className={`rounded-full border p-1.5 ${activeFaq === idx ? 'bg-[#C8862A] text-[#0E1420] border-transparent' : 'border-transparent'}`}>
                        <HelpCircle size={15} className={activeFaq === idx ? 'text-inherit' : 'text-[#C8862A]'} />
                      </span>
                      <h3 className="font-[Space_Grotesk] text-[15px] font-bold">{item.q}</h3>
                    </div>
                    <ChevronRight size={17} className={`transition-transform duration-200 ${activeFaq === idx ? 'rotate-90 text-[#C8862A]' : ''}`} />
                  </button>
                  {activeFaq === idx && (
                    <div className="pb-5 pl-10 pr-3">
                      <p className={`text-[14px] leading-[1.75] ${mutedCls}`}>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Lost Download / Recovery */}
            <div className={`relative overflow-hidden rounded-[28px] bg-[#0E1420] p-7 text-white shadow-2xl md:p-9`}>
              <div className="absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-[#C8862A]/16 blur-3xl"></div>
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8862A]">Recover Your Purchase</p>
              <h3 className="mt-3 font-[Space_Grotesk] text-[21px] font-bold leading-tight">Lost your download link?</h3>
              <p className="mt-3 text-[13.5px] leading-[1.68] text-white/70">
                Enter the email you used to order your download link again instantly. We track delivery records and can re-trigger delivery to WhatsApp or email within a few minutes.
              </p>
              <form onSubmit={handleLostLinkSubmit} className="mt-6 space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono text-[13px]">@</span>
                  <input type="email" required placeholder="Email used for your order"
                    value={lostEmail}
                    onChange={e => setLostEmail(e.target.value)}
                    className="w-full rounded-2xl border border-white/20 bg-white/5 pl-11 pr-4 py-3.5 font-mono text-[12.5px] text-white focus:border-[#C8862A] focus:outline-none placeholder:text-white/40" />
                </div>
                <button type="submit" className="w-full rounded-2xl bg-[#C8862A] py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-wider text-[#0E1420] hover:opacity-90 transition-opacity cursor-pointer">
                  {lostStatus === 'sent' ? 'Link request sent!' : lostStatus === 'error' ? 'Re-request started...' : 'Download link resent'}
                </button>
              </form>
              <p className="mt-3 text-[10.5px] text-white/50 font-mono">Support typically re-sends links within minutes. Delivery stays direct.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Mind Behind Nexa Growth Studio */}
      <section id="founder" className={`py-20 border-y scroll-mt-20 ${dark ? 'border-white/10 bg-[#101722]' : 'border-[#0E1420]/10 bg-[#F2EBDD]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center justify-center gap-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">
              <Sparkles size={12} /> {settings.founderBadge}
            </p>
          </div>
          <div className="mt-12 grid max-w-5xl mx-auto items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-14">
            {/* Portrait */}
            <div className="relative mx-auto w-full max-w-[340px]">
              <div className={`relative overflow-hidden rounded-[28px] shadow-2xl ${dark ? 'ring-1 ring-white/10' : 'ring-1 ring-[#0E1420]/10'}`}>
                {settings.founderPhoto ? (
                  <img
                    src={settings.founderPhoto}
                    alt={settings.founderName}
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className={`aspect-[4/5] w-full grid place-items-center ${dark ? 'bg-[#0E1420]' : 'bg-[#0E1420]'}`}>
                    <span className="font-[Space_Grotesk] text-7xl font-black text-[#C8862A]">
                      {(settings.founderName || 'OS').split(' ').map(p => p[0]).slice(0, 2).join('') || 'N'}
                    </span>
                  </div>
                )}
                <div className={`absolute -bottom-5 -right-3 rounded-2xl px-5 py-3 shadow-xl backdrop-blur-md ${dark ? 'bg-[#192231]/95 ring-1 ring-white/10' : 'bg-white ring-1 ring-[#0E1420]/10'}`}>
                  <p className="font-[Space_Grotesk] text-[14px] font-bold">{settings.founderName}</p>
                  <p className="font-[JetBrains_Mono] text-[8.5px] font-semibold uppercase tracking-[0.15em] text-[#C8862A]">{settings.founderRole}</p>
                </div>
              </div>
            </div>

            {/* Quote + Bio + Tags */}
            <div>
              <h2 className="font-[Space_Grotesk] text-[28px] md:text-[36px] font-bold leading-[1.14] tracking-[-0.02em]">
                &ldquo;{settings.founderQuote}&rdquo;
              </h2>
              <div className={`mt-6 space-y-4 text-[14.5px] leading-[1.75] ${dark ? 'text-white/70' : 'text-[#0E1420]/75'}`}>
                {settings.founderBioParagraph1 && <p>{settings.founderBioParagraph1}</p>}
                {settings.founderBioParagraph2 && <p>{settings.founderBioParagraph2}</p>}
              </div>
              {settings.founderTags && settings.founderTags.length > 0 && (
                <div className={`mt-8 flex flex-wrap gap-2.5 border-t pt-6 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
                  {settings.founderTags.map(tag => (
                    <span
                      key={tag}
                      className={`rounded-full px-3.5 py-1.5 font-[JetBrains_Mono] text-[9px] font-semibold uppercase tracking-[0.12em] ${
                        dark ? 'bg-white/8 text-white/70' : 'bg-[#0E1420] text-white'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Reachout */}
      <section className={`py-20 ${dark ? 'bg-[#090D15]' : 'bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden rounded-[32px] bg-[#0E1420] px-8 py-14 text-center text-white shadow-2xl md:px-16">
            <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#C8862A]/18 blur-3xl" />
            <p className="relative font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8862A]">{settings.contactEyebrow}</p>
            <h2 className="relative mx-auto mt-4 max-w-xl font-[Space_Grotesk] text-[29px] font-bold leading-[1.15] md:text-[39px]">{settings.newsletterHeading}</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-[14px] leading-[1.7] text-white/60">{settings.newsletterSubtitle}</p>
            <div className="relative mt-8 flex flex-col items-center gap-3.5">
              <a href={`https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hi Nexa Growth Studio, I have an enquiry about your books.')}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-[#25D366] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              >
                <MessageCircle size={15} /> WhatsApp the publisher
              </a>
              <a href={`mailto:${settings.officialEmail}`} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-white no-underline transition-colors hover:bg-white/8">
                <Mail size={15} /> {settings.contactEmailCta}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

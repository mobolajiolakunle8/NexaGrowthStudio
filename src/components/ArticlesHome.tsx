import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Flame,
  Newspaper,
  Search,
} from 'lucide-react';
import type { Article, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';
import Footer from './Footer';

interface Props {
  articles: Article[];
  settings: SiteSettings;
}

const THEME_KEY = 'nexa_public_theme';

export function readTimeOf(body: string): number {
  const words = (body || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export function commentCountOf(a: Article): number {
  return (a.comments || []).reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
}

export default function ArticlesHome({ articles, settings }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* ignore */ }
    return settings.defaultTheme || 'light';
  });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved !== 'light' && saved !== 'dark') setTheme(settings.defaultTheme || 'light');
    } catch { /* ignore */ }
  }, [settings.defaultTheme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

  const dark = theme === 'dark';

  const published = useMemo(
    () => articles.filter(a => a.published !== false),
    [articles]
  );

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    published.forEach(a => { if (a.category) set.add(a.category); });
    return Array.from(set);
  }, [published]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return published.filter(a => {
      if (category !== 'All' && a.category !== category) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    });
  }, [published, category, query]);

  const featured = useMemo(
    () => filtered.find(a => a.featured) || filtered[0],
    [filtered]
  );
  const sideStories = useMemo(
    () => filtered.filter(a => a.id !== featured?.id).slice(0, 4),
    [filtered, featured]
  );
  const tickerItems = useMemo(() => published.slice(0, 8), [published]);

  const navLinks: Array<[string, string, string]> = [
    ['Home', '#/', '⌂'],
    ['Articles', '#/articles', '📰'],
    ['Books', '#/', '📚'],
  ];

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]'}`}>
      {/* ── Breaking ticker ── */}
      <div className="overflow-hidden bg-[#0E1420] text-white">
        <div className="mx-auto flex max-w-6xl items-stretch gap-0 px-5">
          <span className="flex shrink-0 items-center gap-1.5 self-center rounded-full bg-[#C8862A] px-3 py-1 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#0E1420]">
            <Flame size={12} /> Latest
          </span>
          <div className="relative flex-1 overflow-hidden py-2.5">
            <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap pl-6 font-[JetBrains_Mono] text-[10.5px] text-white/80">
              {(tickerItems.length ? tickerItems : [{ id: 'x', title: 'Fresh stories from the newsroom — coming soon' } as Article]).map(t => (
                <span key={t.id} className="flex items-center gap-8">
                  <span>{t.title}</span>
                  <span className="text-[#C8862A]">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Masthead ── */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${dark ? 'border-white/10 bg-[#090D15]/90' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>Newsroom</span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#/" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/65' : 'text-[#0E1420]/70'}`}>Home</a>
            <a href="#latest" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/65' : 'text-[#0E1420]/70'}`}>Latest</a>
            <a href="#subscribe" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/65' : 'text-[#0E1420]/70'}`}>Subscribe</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <MobileNav settings={settings} navLinks={navLinks} currentPath="/articles" theme={theme} onToggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-28 -top-32 h-96 w-96 rounded-full bg-[#C8862A]/15 blur-[110px]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-10 md:pt-16">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">The Nexa Journal</p>
          <h1 className="mt-4 max-w-2xl font-[Space_Grotesk] text-[36px] font-bold leading-[1.04] tracking-[-0.03em] md:text-[52px]">
            Stories worth your morning coffee.
          </h1>
          <p className={`mt-4 max-w-xl text-[15px] leading-[1.7] ${dark ? 'text-white/60' : 'text-[#0E1420]/70'}`}>
            Business lessons, founder stories and market insights from the {settings.studioName} desk.
          </p>

          {featured ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <a
                href={`#/article/${featured.slug}`}
                className={`group relative block overflow-hidden rounded-3xl border no-underline shadow-xl transition-transform hover:-translate-y-1 ${dark ? 'border-white/10 bg-[#111824]' : 'border-[#0E1420]/10 bg-white'}`}
              >
                {featured.coverImage ? (
                  <div className="relative h-64 overflow-hidden md:h-80">
                    <img src={featured.coverImage} alt={featured.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </div>
                ) : (
                  <div className="h-40 bg-[#0E1420]" />
                )}
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#C8862A] px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#0E1420]">Featured</span>
                    <span className={`rounded-full px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] ${dark ? 'bg-white/10 text-white/70' : 'bg-[#0E1420]/5 text-[#0E1420]/60'}`}>{featured.category}</span>
                  </div>
                  <h2 className="mt-4 font-[Space_Grotesk] text-[24px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[30px]">{featured.title}</h2>
                  <p className={`mt-3 line-clamp-2 text-[14px] leading-[1.7] ${dark ? 'text-white/60' : 'text-[#0E1420]/65'}`}>{featured.excerpt}</p>
                  <div className={`mt-5 flex flex-wrap items-center gap-4 border-t pt-4 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.12em] ${dark ? 'border-white/10 text-white/40' : 'border-[#0E1420]/10 text-[#0E1420]/45'}`}>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={12} /> {formatDate(featured.createdAt)}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> {readTimeOf(featured.body)} min read</span>
                    <span className="inline-flex items-center gap-1.5">♥ {featured.likes.length}</span>
                    <span className="inline-flex items-center gap-1.5">💬 {commentCountOf(featured)}</span>
                  </div>
                </div>
              </a>

              <div className="flex flex-col gap-4">
                <p className={`font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.22em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#C8862A]" /> More headlines
                </p>
                {sideStories.length ? sideStories.map((a, i) => (
                  <a
                    key={a.id}
                    href={`#/article/${a.slug}`}
                    className={`group flex gap-4 rounded-2xl border p-4 no-underline transition-all hover:-translate-y-0.5 hover:shadow-lg ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-white'}`}
                  >
                    <span className="font-[Space_Grotesk] text-3xl font-black text-[#C8862A]/40">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#C8862A]">{a.category}</span>
                      <span className="mt-1 line-clamp-2 block font-[Space_Grotesk] text-[15px] font-bold leading-snug transition-colors group-hover:text-[#C8862A]">{a.title}</span>
                      <span className={`mt-1.5 block font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
                        {formatDate(a.createdAt)} · ♥ {a.likes.length}
                      </span>
                    </span>
                  </a>
                )) : (
                  <p className={`text-sm ${dark ? 'text-white/50' : 'text-[#0E1420]/55'}`}>More stories are on the way.</p>
                )}
              </div>
            </div>
          ) : (
            <div className={`mt-10 rounded-3xl border border-dashed py-20 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}>
              <Newspaper className="mx-auto text-[#C8862A]" size={28} />
              <p className="mt-4 font-[Space_Grotesk] text-lg font-bold">The newsroom is warming up</p>
              <p className={`mt-1 text-sm ${dark ? 'text-white/50' : 'text-[#0E1420]/55'}`}>First stories drop soon. Subscribe below so you never miss one.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Category filter + search ── */}
      <section id="latest" className={`scroll-mt-20 border-t py-14 ${dark ? 'border-white/10 bg-[#090D15]' : 'border-[#0E1420]/10 bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">Browse the archive</p>
              <h2 className="mt-3 font-[Space_Grotesk] text-[30px] font-bold tracking-[-0.025em] md:text-[42px]">Latest stories</h2>
            </div>
            <div className={`flex w-full max-w-xs items-center gap-2 rounded-full border px-4 py-2.5 ${dark ? 'border-white/15 bg-white/[0.04]' : 'border-[#0E1420]/15 bg-white'}`}>
              <Search size={15} className="shrink-0 text-[#C8862A]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search stories…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-current placeholder:opacity-40"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                  category === c
                    ? 'bg-[#C8862A] text-[#0E1420]'
                    : dark
                      ? 'border border-white/15 text-white/60 hover:border-[#C8862A]/50'
                      : 'border border-[#0E1420]/15 text-[#0E1420]/60 hover:border-[#C8862A]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length ? (
            <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(article => (
                <a
                  key={article.id}
                  href={`#/article/${article.slug}`}
                  className={`group flex flex-col overflow-hidden rounded-3xl border no-underline shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-white'}`}
                >
                  <div className={`relative h-48 overflow-hidden ${dark ? 'bg-[#111824]' : 'bg-[#F2EBDD]'}`}>
                    {article.coverImage ? (
                      <img src={article.coverImage} alt={article.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <div className="grid h-full place-items-center">
                        <Newspaper size={32} className="text-[#C8862A]/50" />
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-[#0E1420]/85 px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#C8862A] backdrop-blur">
                      {article.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-[Space_Grotesk] text-[17px] font-bold leading-snug transition-colors group-hover:text-[#C8862A]">
                      {article.title}
                    </h3>
                    <p className={`mt-2 line-clamp-2 flex-1 text-[13px] leading-[1.65] ${dark ? 'text-white/55' : 'text-[#0E1420]/65'}`}>
                      {article.excerpt}
                    </p>
                    <div className={`mt-5 flex items-center justify-between border-t pt-4 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${dark ? 'border-white/10 text-white/35' : 'border-[#0E1420]/10 text-[#0E1420]/40'}`}>
                      <span>{formatDate(article.createdAt)} · {readTimeOf(article.body)} min</span>
                      <span className="inline-flex items-center gap-2">
                        <span>♥ {article.likes.length}</span>
                        <span>💬 {commentCountOf(article)}</span>
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={`mt-10 rounded-3xl border border-dashed py-16 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}>
              <p className="font-[Space_Grotesk] text-lg font-bold">
                {query || category !== 'All' ? 'No stories match your search.' : 'No stories published yet.'}
              </p>
              {(query || category !== 'All') && (
                <button onClick={() => { setQuery(''); setCategory('All'); }} className="mt-3 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-wider text-[#C8862A] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Subscribe band ── */}
      <section id="subscribe" className={`scroll-mt-20 border-t py-16 ${dark ? 'border-white/10 bg-[#0A0F18]' : 'border-[#0E1420]/10 bg-[#F2EBDD]'}`}>
        <div className="mx-auto max-w-3xl px-5 text-center">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">Never miss a story</p>
          <h2 className="mt-3 font-[Space_Grotesk] text-[28px] font-bold tracking-[-0.02em] md:text-[36px]">Get every new article by email</h2>
          <p className={`mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed ${dark ? 'text-white/55' : 'text-[#0E1420]/65'}`}>
            Join the reader list — new stories land in your inbox the moment they are published. Zero spam, unsubscribe anytime.
          </p>
          <SubscribeInline />
        </div>
      </section>

      <Footer settings={settings} dark={dark} />
    </div>
  );
}

function SubscribeInline() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'invalid' | 'failed'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setStatus('invalid'); return; }
    setStatus('sending');
    try {
      const { addSubscriberInCloud } = await import('../cloud');
      await addSubscriberInCloud({
        id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        email: clean,
        date: new Date().toISOString(),
        status: 'active',
      });
      setStatus('sent');
      setEmail('');
    } catch { setStatus('failed'); }
  };

  if (status === 'sent') {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-center">
        <p className="font-[Space_Grotesk] text-[16px] font-bold text-emerald-300">You're on the list! 🎉</p>
        <p className="mt-1 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-white/55">
          New stories will land in your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-md" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'sending'}
          className="w-full flex-1 rounded-full border border-[#C8862A]/30 bg-[#0E1420] px-5 py-3.5 font-mono text-[12.5px] text-white focus:border-[#C8862A] focus:outline-none placeholder:text-white/35 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="shrink-0 rounded-full bg-[#C8862A] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {status === 'sending' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      {status === 'invalid' && <p className="mt-3 text-xs text-red-400">Please enter a valid email address.</p>}
      {status === 'failed' && <p className="mt-3 text-xs text-red-400">Something went wrong. Please try again.</p>}
    </form>
  );
}

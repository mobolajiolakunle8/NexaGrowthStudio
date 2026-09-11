import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Flame, LayoutGrid, Search } from 'lucide-react';
import type { Article, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';
import SubscribeForm from './SubscribeForm';

interface Props {
  articles: Article[];
  settings: SiteSettings;
}

const THEME_KEY = 'nexa_public_theme';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
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

  const dark = theme === 'dark';
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

  const published = useMemo(
    () => articles.filter(a => a.published !== false),
    [articles]
  );
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(published.map(a => a.category).filter(Boolean))) as string[]],
    [published]
  );
  const filtered = useMemo(() => {
    let list = published;
    if (category !== 'All') list = list.filter(a => a.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [published, category, query]);

  const featured = useMemo(
    () => published.find(a => a.featured) || published[0],
    [published]
  );
  const trending = useMemo(() => published.slice(0, 5), [published]);

  const darkCls = dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]';
  const mutedCls = dark ? 'text-white/60' : 'text-[#0E1420]/65';
  const subtleCls = dark ? 'text-white/40' : 'text-[#0E1420]/45';
  const cardCls = dark ? 'border-white/10 bg-white/[0.045]' : 'border-[#0E1420]/10 bg-white';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${darkCls}`}>
      {/* Masthead */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? 'border-white/10 bg-[#090D15]/92' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${subtleCls}`}>Articles &amp; Insights</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <a href="#/" className="hidden items-center gap-1.5 rounded-full border border-[#C8862A]/40 px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A] no-underline transition-colors hover:bg-[#C8862A] hover:text-[#0E1420] sm:inline-flex">
              <ArrowLeft size={12} /> Home
            </a>
          </div>
        </div>
      </header>

      {/* Ticker */}
      {published.length > 0 && (
        <div className="overflow-hidden border-b border-[#C8862A]/25 bg-[#0E1420] py-2.5">
          <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap px-5">
            {[...published.slice(0, 8), ...published.slice(0, 8)].map((a, i) => (
              <a key={`${a.id}-${i}`} href={`#/article/${a.slug}`} className="inline-flex items-center gap-2 font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70 no-underline hover:text-[#C8862A]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C8862A]" />
                {a.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#C8862A]/14 blur-[110px]" />
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-14 md:pt-20">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">
            {settings.location} · Insights Desk
          </p>
          <h1 className="mt-4 max-w-3xl font-[Space_Grotesk] text-[38px] font-bold leading-[1.03] tracking-[-0.03em] md:text-[60px]">
            Stories &amp; ideas from the studio.
          </h1>
          <p className={`mt-5 max-w-xl text-[15px] leading-[1.7] ${mutedCls}`}>
            Field notes, essays and announcements from {settings.studioName} — practical thinking for founders, operators and curious readers.
          </p>

          {/* Search + categories */}
          <div className="mt-9 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search articles, topics, tags…"
                className={`w-full rounded-full border py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-white/[0.05] placeholder:text-white/30' : 'border-[#0E1420]/15 bg-white placeholder:text-[#0E1420]/35'}`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                    category === c
                      ? 'bg-[#C8862A] text-[#0E1420]'
                      : dark ? 'border border-white/15 text-white/60 hover:border-[#C8862A]/60' : 'border border-[#0E1420]/15 text-[#0E1420]/60 hover:border-[#C8862A]/60'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured story */}
      {featured && !query.trim() && category === 'All' && (
        <section className="mx-auto max-w-6xl px-5 pb-4">
          <a href={`#/article/${featured.slug}`} className={`group grid overflow-hidden rounded-3xl border no-underline shadow-xl transition-all duration-300 hover:-translate-y-1 md:grid-cols-2 ${cardCls}`}>
            <div className="relative min-h-[260px] overflow-hidden md:min-h-[340px]">
              {featured.coverImage ? (
                <img src={featured.coverImage} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[#0E1420]">
                  <span className="font-[Space_Grotesk] text-5xl font-black text-[#C8862A]">N</span>
                </div>
              )}
              <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#C8862A] px-3 py-1.5 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#0E1420]">
                <Flame size={11} /> Featured story
              </span>
            </div>
            <div className="flex flex-col justify-center p-7 md:p-10">
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8862A]">
                {featured.category || 'Insights'} · {formatDate(featured.updatedAt || featured.createdAt)}
              </p>
              <h2 className="mt-3 font-[Space_Grotesk] text-[26px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[34px]">
                {featured.title}
              </h2>
              <p className={`mt-4 line-clamp-3 text-[14px] leading-[1.7] ${mutedCls}`}>{featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-2 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] text-[#C8862A]">
                Read full story <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </a>
        </section>
      )}

      {/* Grid + sidebar */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-7 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-[Space_Grotesk] text-xl font-bold">
                <LayoutGrid size={18} className="text-[#C8862A]" /> Latest stories
              </h2>
              <span className={`font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] ${subtleCls}`}>
                {filtered.length} article{filtered.length === 1 ? '' : 's'}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className={`rounded-3xl border border-dashed py-16 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}>
                <p className="font-[Space_Grotesk] text-lg font-bold">No stories found</p>
                <p className={`mt-2 text-sm ${mutedCls}`}>Try a different search or category — or check back soon.</p>
                {(query || category !== 'All') && (
                  <button onClick={() => { setQuery(''); setCategory('All'); }} className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-[#C8862A] hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {filtered.map(a => (
                  <a key={a.id} href={`#/article/${a.slug}`} className={`group flex flex-col overflow-hidden rounded-3xl border no-underline shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${cardCls}`}>
                    <div className="relative h-44 overflow-hidden">
                      {a.coverImage ? (
                        <img src={a.coverImage} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-[#0E1420]">
                          <span className="font-[Space_Grotesk] text-3xl font-black text-[#C8862A]">N</span>
                        </div>
                      )}
                      <span className="absolute left-4 top-4 rounded-full bg-black/60 px-2.5 py-1 font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-[0.13em] text-white backdrop-blur">
                        {a.category || 'Insights'}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] ${subtleCls}`}>
                        {formatDate(a.updatedAt || a.createdAt)} · {a.readMinutes || 3} min read
                      </p>
                      <h3 className="mt-2 line-clamp-2 font-[Space_Grotesk] text-[16px] font-bold leading-snug">{a.title}</h3>
                      <p className={`mt-2 line-clamp-2 flex-1 text-[12.5px] leading-[1.65] ${mutedCls}`}>{a.excerpt}</p>
                      <span className="mt-4 inline-flex items-center gap-1 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">
                        Read story <ArrowRight size={11} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className={`rounded-3xl border p-6 ${cardCls}`}>
              <h3 className="flex items-center gap-2 font-[Space_Grotesk] text-[15px] font-bold">
                <Flame size={15} className="text-[#C8862A]" /> Trending now
              </h3>
              <div className="mt-5 space-y-4">
                {trending.length === 0 && <p className={`text-xs ${mutedCls}`}>Stories will appear here once published.</p>}
                {trending.map((a, i) => (
                  <a key={a.id} href={`#/article/${a.slug}`} className="group flex items-start gap-3 no-underline">
                    <span className="font-[Space_Grotesk] text-2xl font-black text-[#C8862A]/40 transition-colors group-hover:text-[#C8862A]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="line-clamp-2 block text-[13px] font-semibold leading-snug transition-colors group-hover:text-[#C8862A]">{a.title}</span>
                      <span className={`mt-1 block font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${subtleCls}`}>
                        {a.category || 'Insights'} · {a.readMinutes || 3} min
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-[#0E1420] p-6 text-white shadow-xl">
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8862A]">Stay in the loop</p>
              <p className="mt-2 font-[Space_Grotesk] text-[16px] font-bold leading-snug">Get every new story by email.</p>
              <SubscribeForm />
            </div>
          </aside>
        </div>
      </section>

      <Footer settings={settings} dark={dark} />
    </div>
  );
}

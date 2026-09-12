import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Newspaper, Search, TrendingUp } from 'lucide-react';
import type { Article, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import SubscribeForm from './SubscribeForm';

interface Props {
  articles: Article[];
  settings: SiteSettings;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export default function ArticlesHome({ articles, settings, theme, onToggleTheme }: Props) {
  const dark = theme === 'dark';
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const published = useMemo(
    () => articles.filter(a => a.published !== false),
    [articles]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    published.forEach(a => { if (a.category?.trim()) set.add(a.category.trim()); });
    return ['All', ...Array.from(set).sort()];
  }, [published]);

  const filtered = useMemo(() => {
    let list = published.slice();
    if (activeCategory !== 'All') {
      list = list.filter(a => (a.category || '').trim().toLowerCase() === activeCategory.toLowerCase());
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.excerpt || '').toLowerCase().includes(q) ||
        (a.tags || []).join(' ').toLowerCase().includes(q) ||
        (a.author || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [published, activeCategory, query]);

  const [featured, ...rest] = filtered;
  const trending = useMemo(() => published.filter(a => a.id !== featured?.id).slice(0, 4), [published, featured]);

  const muted = dark ? 'text-white/60' : 'text-[#0E1420]/65';
  const subtle = dark ? 'text-white/40' : 'text-[#0E1420]/45';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]'}`}>
      {/* ── Breaking-news ticker ── */}
      <div className="bg-[#0E1420] text-white overflow-hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-2">
          <span className="shrink-0 rounded-full bg-[#C8862A] px-2.5 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#0E1420]">
            Latest
          </span>
          <div className="relative flex-1 overflow-hidden">
            <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.12em] text-white/70">
              {(published.length ? published.slice(0, 8) : [{ title: 'Fresh stories from the studio are on the way' } as Article]).map((a, i) => (
                <span key={a.id || i} className="flex items-center gap-10">
                  <span>{a.title}</span>
                  <span className="text-[#C8862A]">✦</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Masthead ── */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? 'border-white/10 bg-[#090D15]/90' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${subtle}`}>Newsroom &amp; Articles</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={onToggleTheme} compact />
            <a href="#/" className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#0E1420]/15 px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] no-underline transition-colors hover:border-[#C8862A] hover:text-[#C8862A]">
              <ArrowLeft size={13} /> Home
            </a>
          </div>
        </div>
      </header>

      {/* ── Newsroom hero ── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#C8862A]/14 blur-[110px]" />
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-10 md:pt-16">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">
            The Nexa Newsroom
          </p>
          <h1 className="mt-4 font-[Space_Grotesk] text-[34px] font-bold leading-[1.04] tracking-[-0.03em] md:text-[56px]">
            Stories, lessons<br />&amp; announcements.
          </h1>
          <p className={`mt-4 max-w-xl text-[14.5px] leading-[1.7] ${muted}`}>
            Field notes from the studio, practical business thinking, and first word on every new release.
            New posts land here first — subscribers get them by email automatically.
          </p>

          {/* Search + category filter */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-sm">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="search"
                placeholder="Search articles…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className={`w-full rounded-full border py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-[#C8862A] ${
                  dark ? 'border-white/15 bg-white/[0.05] text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'
                }`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`rounded-full px-4 py-2.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${
                    activeCategory === c
                      ? 'bg-[#C8862A] text-[#0E1420]'
                      : dark
                        ? 'border border-white/15 text-white/60 hover:border-[#C8862A]/50 hover:text-white'
                        : 'border border-[#0E1420]/15 text-[#0E1420]/60 hover:border-[#C8862A]/60 hover:text-[#0E1420]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured story ── */}
      {featured ? (
        <section className="mx-auto max-w-6xl px-5 pb-6">
          <a
            href={`#/article/${featured.slug}`}
            className={`group grid overflow-hidden rounded-[28px] border no-underline shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl md:grid-cols-[1.1fr_1fr] ${
              dark ? 'border-white/10 bg-[#111824]' : 'border-[#0E1420]/10 bg-white'
            }`}
          >
            <div className="relative min-h-[260px] overflow-hidden md:min-h-[340px]">
              {featured.coverImage ? (
                <img src={featured.coverImage} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[#0E1420]">
                  <Newspaper size={48} className="text-[#C8862A]/60" />
                </div>
              )}
              <span className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#C8862A] px-3 py-1.5 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#0E1420] shadow-lg">
                <TrendingUp size={11} /> Featured story
              </span>
            </div>
            <div className="flex flex-col justify-center p-7 md:p-10">
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8862A]">
                {featured.category || 'Newsroom'} {featured.readMinutes ? `· ${featured.readMinutes} min read` : ''}
              </p>
              <h2 className="mt-3 font-[Space_Grotesk] text-[26px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[34px]">
                {featured.title}
              </h2>
              <p className={`mt-3 line-clamp-3 text-[14px] leading-[1.7] ${muted}`}>{featured.excerpt}</p>
              <div className={`mt-5 flex items-center gap-3 border-t pt-5 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] text-xs font-bold text-[#C8862A]">
                  {(featured.author || 'N').split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
                <div>
                  <p className="font-[Space_Grotesk] text-[13px] font-bold">{featured.author || settings.founderName}</p>
                  <p className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.13em] ${subtle}`}>
                    {formatDate(featured.updatedAt || featured.createdAt)}
                  </p>
                </div>
                <span className="ml-auto font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">
                  Read →
                </span>
              </div>
            </div>
          </a>
        </section>
      ) : null}

      {/* ── Story grid + trending rail ── */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        {filtered.length === 0 ? (
          <div className={`mt-8 rounded-3xl border border-dashed py-20 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}>
            <Newspaper className="mx-auto text-[#C8862A]" size={32} />
            <p className="mt-4 font-[Space_Grotesk] text-lg font-bold">
              {query || activeCategory !== 'All' ? 'No stories match your search' : 'Fresh stories are on the way'}
            </p>
            <p className={`mt-1 text-sm ${muted}`}>
              {query || activeCategory !== 'All' ? 'Try a different keyword or category.' : 'New articles from the studio will appear here first.'}
            </p>
            {(query || activeCategory !== 'All') && (
              <button onClick={() => { setQuery(''); setActiveCategory('All'); }} className="mt-4 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8862A] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
            {/* Cards */}
            <div className="grid gap-6 sm:grid-cols-2">
              {rest.map((article, i) => (
                <a
                  key={article.id}
                  href={`#/article/${article.slug}`}
                  className={`group flex flex-col overflow-hidden rounded-3xl border no-underline shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
                    dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white'
                  }`}
                >
                  <div className="relative h-48 overflow-hidden">
                    {article.coverImage ? (
                      <img src={article.coverImage} alt={article.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" loading="lazy" />
                    ) : (
                      <div className={`grid h-full w-full place-items-center ${i % 2 ? 'bg-[#EEF0EA]' : 'bg-[#F2EBDD]'}`}>
                        <Newspaper size={30} className="text-[#C8862A]/60" />
                      </div>
                    )}
                    {article.category && (
                      <span className="absolute left-4 top-4 rounded-full bg-black/70 px-2.5 py-1 font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-[0.13em] text-white backdrop-blur">
                        {article.category}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className={`flex items-center gap-1.5 font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.14em] ${subtle}`}>
                      <CalendarDays size={11} /> {formatDate(article.updatedAt || article.createdAt)}
                    </p>
                    <h3 className="mt-2.5 font-[Space_Grotesk] text-[16.5px] font-bold leading-snug">{article.title}</h3>
                    <p className={`mt-2 line-clamp-2 flex-1 text-[12.5px] leading-[1.65] ${muted}`}>{article.excerpt}</p>
                    <span className="mt-4 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">
                      Read story →
                    </span>
                  </div>
                </a>
              ))}
              {rest.length === 0 && featured && (
                <p className={`sm:col-span-2 text-center font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.16em] ${subtle}`}>
                  More stories are being written — check back soon.
                </p>
              )}
            </div>

            {/* Trending rail + subscribe */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className={`rounded-3xl border p-6 ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white shadow-sm'}`}>
                <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8862A]">
                  Trending in the studio
                </p>
                <div className="mt-5 space-y-5">
                  {trending.length === 0 && (
                    <p className={`text-[12.5px] ${muted}`}>Trending stories will appear here.</p>
                  )}
                  {trending.map((a, i) => (
                    <a key={a.id} href={`#/article/${a.slug}`} className="group flex gap-4 no-underline">
                      <span className="font-[Space_Grotesk] text-3xl font-black text-[#C8862A]/35 transition-colors group-hover:text-[#C8862A]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <span className="line-clamp-2 font-[Space_Grotesk] text-[13.5px] font-bold leading-snug group-hover:text-[#C8862A] transition-colors">
                          {a.title}
                        </span>
                        <span className={`mt-1 block font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.13em] ${subtle}`}>
                          {a.category || 'Newsroom'} · {a.readMinutes ? `${a.readMinutes} min` : formatDate(a.updatedAt || a.createdAt)}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl bg-[#0E1420] p-7 text-center text-white shadow-xl">
                <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8862A]">
                  Never miss a post
                </p>
                <p className="mt-2 font-[Space_Grotesk] text-[19px] font-bold leading-tight">
                  Get every article by email.
                </p>
                <div className="[&_form]:!mt-5">
                  <SubscribeFormCompact />
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* Footer strip */}
      <footer className={`border-t py-8 ${dark ? 'border-white/10 bg-[#070A10]' : 'border-[#0E1420]/10 bg-white'}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-center sm:flex-row sm:text-left">
          <p className={`font-[JetBrains_Mono] text-[9.5px] tracking-wide ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>
            © {new Date().getFullYear()} {settings.copyrightText}
          </p>
          <a href="#/" className={`font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.13em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>
            ← Back to {settings.studioName}
          </a>
        </div>
      </footer>
    </div>
  );
}

function SubscribeFormCompact() {
  return <SubscribeForm />;
}

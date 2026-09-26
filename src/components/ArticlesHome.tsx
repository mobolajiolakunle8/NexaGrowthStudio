import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, Heart, MessageSquare, Newspaper, Search } from 'lucide-react';
import type { Article, ArticleComment, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';
import SubscribeForm from './SubscribeForm';
import { usePublicTheme } from '../hooks/usePublicTheme';

interface Props {
  articles: Article[];
  comments: ArticleComment[];
  settings: SiteSettings;
}

export function readMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatArticleDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function ArticlesHome({ articles, comments, settings }: Props) {
  const { theme, dark, toggleTheme } = usePublicTheme(settings);
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
    const q = query.trim().toLowerCase();
    return published.filter(a => {
      if (activeCategory !== 'All' && (a.category || '').trim() !== activeCategory) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    });
  }, [published, query, activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);
  const breaking = published.slice(0, 4);

  const commentCount = (id: string) => comments.filter(c => c.articleId === id).length;

  const navLinks: Array<[string, string, string]> = [
    ['Home', '#/', 'Home'],
    ['Articles', '#/articles', 'Articles'],
    ['Books', '#catalogue-home', 'Catalogue'],
  ];

  const pageCls = dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]';
  const mutedCls = dark ? 'text-white/60' : 'text-[#0E1420]/65';
  const subtleCls = dark ? 'text-white/40' : 'text-[#0E1420]/45';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-700 ${pageCls}`}>
      <MobileNav settings={settings} navLinks={navLinks} currentPath="/articles" theme={theme} onToggleTheme={toggleTheme} />

      {/* Sticky masthead */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? 'border-white/10 bg-[#090D15]/92' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${subtleCls}`}>News &amp; Insights Desk</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#/" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline hover:text-[#C8862A] transition-colors ${mutedCls}`}>Home</a>
            <a href="#/articles" className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8862A] no-underline">Articles</a>
            <a href="#latest" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline hover:text-[#C8862A] transition-colors ${mutedCls}`}>Latest</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <a href="#latest" className="hidden rounded-full bg-[#C8862A] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] text-[#0E1420] no-underline transition-transform hover:-translate-y-0.5 sm:inline-flex">Read latest</a>
          </div>
        </div>
      </header>

      {/* Newspaper hero */}
      <section className={`relative overflow-hidden border-b ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#C8862A]/15 blur-[110px]" />
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#A8452F] px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.16em] text-white">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              The Nexa Journal
            </span>
            <span className={`font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.16em] ${subtleCls}`}>
              {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {settings.location}
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl font-[Space_Grotesk] text-[38px] font-bold leading-[1.0] tracking-[-0.035em] md:text-[60px]">
            Stories, essays &amp; field notes from the studio.
          </h1>
          <p className={`mt-4 max-w-xl text-[15px] leading-[1.7] ${mutedCls}`}>
            Practical thinking on business, branding and growth in Nigeria — published by {settings.founderName}. Read free, react, and join the conversation.
          </p>

          {/* Breaking ticker */}
          {breaking.length > 0 && (
            <div className={`mt-8 flex items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white'}`}>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#A8452F] px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                <Newspaper size={11} /> Latest
              </span>
              <div className="relative flex-1 overflow-hidden">
                <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap">
                  {[...breaking, ...breaking].map((a, i) => (
                    <a key={`${a.id}-${i}`} href={`#/article/${a.slug}`} className={`font-[Space_Grotesk] text-[13px] font-semibold no-underline hover:text-[#C8862A] ${dark ? 'text-white/80' : 'text-[#0E1420]/80'}`}>
                      {a.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main news body */}
      <main id="latest" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-12">
        {/* Search + categories */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="search"
              placeholder="Search stories, topics, tags..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={`w-full rounded-full border py-3 pl-11 pr-4 text-sm focus:border-[#C8862A] focus:outline-none ${dark ? 'border-white/15 bg-black/25 text-white placeholder:text-white/35' : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`rounded-full px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] transition-colors ${
                  activeCategory === c
                    ? 'bg-[#C8862A] text-[#0E1420]'
                    : dark ? 'border border-white/15 text-white/60 hover:border-[#C8862A]/50 hover:text-white' : 'border border-[#0E1420]/15 text-[#0E1420]/60 hover:border-[#C8862A] hover:text-[#0E1420]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className={`mt-12 rounded-3xl border border-dashed py-20 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}>
            <Newspaper size={28} className="mx-auto text-[#C8862A]" />
            <p className="mt-4 font-[Space_Grotesk] text-lg font-bold">
              {query || activeCategory !== 'All' ? 'No stories match your search' : 'No stories published yet'}
            </p>
            <p className={`mt-1 text-sm ${mutedCls}`}>
              {query || activeCategory !== 'All' ? 'Try a different keyword or category.' : 'The publisher is preparing the first edition. Check back soon.'}
            </p>
            {(query || activeCategory !== 'All') && (
              <button onClick={() => { setQuery(''); setActiveCategory('All'); }} className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-[#C8862A] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured story */}
            {featured && (
              <a href={`#/article/${featured.slug}`} className="group mt-10 grid overflow-hidden rounded-[28px] border no-underline shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl md:grid-cols-2" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(14,20,32,0.1)', background: dark ? '#111824' : '#FFFFFF' }}>
                <div className={`relative min-h-[260px] overflow-hidden ${!featured.images[0] ? 'bg-[#0E1420]' : ''}`}>
                  {featured.images[0] ? (
                    <img src={featured.images[0]} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="grid h-full min-h-[260px] place-items-center p-10 text-center">
                      <span className="font-[Space_Grotesk] text-5xl font-black text-[#C8862A]/30">{featured.title.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="absolute left-5 top-5 rounded-full bg-[#A8452F] px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.16em] text-white">
                    Featured
                  </span>
                </div>
                <div className="flex flex-col justify-center p-7 md:p-10">
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.16em] ${subtleCls}`}>
                    {featured.category && <span className="font-bold text-[#C8862A]">{featured.category}</span>}
                    <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatArticleDate(featured.publishedAt || featured.createdAt)}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 size={11} /> {readMinutes(featured.content)} min read</span>
                  </div>
                  <h2 className="mt-4 font-[Space_Grotesk] text-[26px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[34px]">{featured.title}</h2>
                  <p className={`mt-3 line-clamp-3 text-[14px] leading-[1.7] ${mutedCls}`}>{featured.excerpt}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <div className={`flex items-center gap-4 font-[JetBrains_Mono] text-[10px] ${subtleCls}`}>
                      <span className="inline-flex items-center gap-1.5"><Heart size={12} className="text-[#A8452F]" /> {featured.likes || 0}</span>
                      <span className="inline-flex items-center gap-1.5"><MessageSquare size={12} /> {commentCount(featured.id)}</span>
                    </div>
                    <span className="font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">Read story →</span>
                  </div>
                </div>
              </a>
            )}

            {/* Story grid */}
            {rest.length > 0 && (
              <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a, i) => (
                  <a
                    key={a.id}
                    href={`#/article/${a.slug}`}
                    className={`group flex flex-col overflow-hidden rounded-3xl border no-underline shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${dark ? 'border-white/10 bg-white/[0.045]' : 'border-[#0E1420]/10 bg-white'}`}
                  >
                    <div className={`relative h-48 overflow-hidden ${!a.images[0] ? 'bg-[#0E1420]' : ''}`}>
                      {a.images[0] ? (
                        <img src={a.images[0]} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <span className="font-[Space_Grotesk] text-4xl font-black text-[#C8862A]/40">{a.title.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                      {a.category && (
                        <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                          {a.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className={`flex items-center gap-3 font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.13em] ${subtleCls}`}>
                        <span>{formatArticleDate(a.publishedAt || a.createdAt)}</span>
                        <span>·</span>
                        <span>{readMinutes(a.content)} min read</span>
                        <span className="ml-auto font-bold text-[#C8862A]/70">N-{String(i + 2).padStart(3, '0')}</span>
                      </div>
                      <h3 className="mt-2.5 line-clamp-2 font-[Space_Grotesk] text-[16.5px] font-bold leading-snug">{a.title}</h3>
                      <p className={`mt-2 line-clamp-2 flex-1 text-[12.5px] leading-[1.65] ${mutedCls}`}>{a.excerpt}</p>
                      <div className={`mt-4 flex items-center justify-between border-t pt-3.5 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
                        <div className={`flex items-center gap-3 font-[JetBrains_Mono] text-[9.5px] ${subtleCls}`}>
                          <span className="inline-flex items-center gap-1"><Heart size={11} className="text-[#A8452F]" /> {a.likes || 0}</span>
                          <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {commentCount(a.id)}</span>
                        </div>
                        <span className="font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#C8862A] transition-transform group-hover:translate-x-1">Read →</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Newsletter banner */}
      <section className={`border-t py-14 ${dark ? 'border-white/10 bg-black/25' : 'border-[#0E1420]/10 bg-[#F2EBDD]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden rounded-[28px] bg-[#0E1420] px-7 py-12 text-center text-white shadow-2xl md:px-14">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#C8862A]/16 blur-3xl" />
            <p className="relative font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.24em] text-[#C8862A]">Never miss a story</p>
            <h2 className="relative mx-auto mt-3 max-w-xl font-[Space_Grotesk] text-[24px] font-bold leading-tight md:text-[32px]">Get every new article in your inbox.</h2>
            <p className="relative mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-white/60">
              One email per new story. Practical thinking, no spam — unsubscribe anytime.
            </p>
            <div className="relative [&>form]:mt-0 [&>div]:mt-6">
              <SubscribeForm />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-8 ${dark ? 'border-white/10 bg-[#070A10]' : 'border-[#0E1420]/10 bg-white'}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:text-left">
          <p className={`font-[JetBrains_Mono] text-[9.5px] tracking-wide ${subtleCls}`}>© {new Date().getFullYear()} {settings.copyrightText}</p>
          <div className="flex items-center gap-5">
            <a href="#/" className={`font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.13em] no-underline hover:text-[#C8862A] ${mutedCls}`}>← Library</a>
            <a href={`mailto:${settings.officialEmail}`} className={`font-[JetBrains_Mono] text-[9.5px] no-underline hover:text-[#C8862A] ${mutedCls}`}>{settings.officialEmail}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

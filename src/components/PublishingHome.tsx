import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Mail, MessageCircle, Sparkles } from 'lucide-react';
import type { Book, SiteSettings } from '../types';
import BookCover from './BookCover';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';

interface Props {
  books: Book[];
  settings: SiteSettings;
}

const THEME_KEY = 'nexa_public_theme';

const money = (book: Book) =>
  `${book.payment?.currency || '₦'}${(book.payment?.price ?? 0).toLocaleString()}`;

export default function PublishingHome({ books, settings }: Props) {
  const published = books.filter(book => book.published !== false);
  const featured = published[0];
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* use synced default */ }
    return settings.defaultTheme || 'light';
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved !== 'light' && saved !== 'dark') setTheme(settings.defaultTheme || 'light');
    } catch { /* ignore */ }
  }, [settings.defaultTheme]);

  const dark = theme === 'dark';
  const setPublicTheme = (next: 'light' | 'dark') => {
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

  const page = dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]';
  const panel = dark ? 'border-white/10 bg-white/[0.045]' : 'border-[#0E1420]/10 bg-white';
  const muted = dark ? 'text-white/60' : 'text-[#0E1420]/65';
  const subtle = dark ? 'text-white/40' : 'text-[#0E1420]/45';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${page}`}>
      {settings.generalBooksUrl ? (
        <div className={`border-b px-5 py-2.5 ${dark ? 'border-white/10 bg-black/25' : 'border-[#0E1420]/10 bg-[#0E1420] text-white'}`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <p className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.18em] opacity-65">
              Independent publishing from {settings.location}
            </p>
            <a href={settings.generalBooksUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em] text-white no-underline transition-colors hover:bg-white hover:text-[#0E1420]">
              {settings.generalBooksLabel || 'General Books'} <ArrowRight size={11} />
            </a>
          </div>
        </div>
      ) : null}

      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${dark ? 'border-white/10 bg-[#090D15]/90' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${subtle}`}>{settings.studioTagline}</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {[
              [settings.navCatalogueLabel, '#catalogue'],
              [settings.navManifestoLabel, '#standard'],
              [settings.navFounderLabel, '#founder'],
            ].map(([label, href]) => (
              <a key={href} href={href} className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] no-underline transition-colors hover:text-[#C8862A] ${muted}`}>{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={() => setPublicTheme(dark ? 'light' : 'dark')} compact />
            <a href="#catalogue" className="hidden rounded-full bg-[#C8862A] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#0E1420] no-underline transition-transform hover:-translate-y-0.5 sm:inline-flex">Browse books</a>
          </div>
        </div>
      </header>

      <section className={`relative overflow-hidden border-b ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
        <div className="pointer-events-none absolute -left-28 -top-32 h-96 w-96 rounded-full bg-[#C8862A]/15 blur-[110px]" />
        <div className="pointer-events-none absolute -right-28 top-8 h-96 w-96 rounded-full bg-[#4F6B52]/12 blur-[120px]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 md:grid-cols-[1.14fr_0.86fr] md:py-24">
          <div className="relative z-10 animate-fade-up">
            <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">{settings.heroKicker}</p>
            {settings.heroBadgeText ? (
              <span className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-[JetBrains_Mono] text-[9px] font-semibold uppercase tracking-[0.14em] ${dark ? 'border-[#C8862A]/25 bg-[#C8862A]/10 text-[#E0B27A]' : 'border-[#C8862A]/20 bg-[#C8862A]/10 text-[#8A5B18]'}`}><Sparkles size={10} /> {settings.heroBadgeText}</span>
            ) : null}
            <h1 className="mt-5 max-w-3xl font-[Space_Grotesk] text-[39px] font-bold leading-[1.02] tracking-[-0.035em] md:text-[64px]">{settings.heroTitle}</h1>
            <p className={`mt-6 max-w-xl text-[15.5px] leading-[1.75] md:text-[16.5px] ${muted}`}>{settings.heroSubtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href="#catalogue" className={`rounded-full px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-transform hover:-translate-y-0.5 ${dark ? 'bg-[#F8F3EA] text-[#0E1420]' : 'bg-[#0E1420] text-white'}`}>{settings.heroPrimaryCta}</a>
              <a href="#founder" className={`rounded-full border px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-colors hover:border-[#C8862A] ${dark ? 'border-white/15 text-white/80' : 'border-[#0E1420]/20 text-[#0E1420]'}`}>{settings.heroSecondaryCta}</a>
            </div>
            <div className={`mt-12 grid max-w-lg grid-cols-3 border-t pt-6 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
              {[[String(published.length).padStart(2, '0'), 'Published titles'], ['100%', 'Market relevant'], ['Direct', 'Digital delivery']].map(([value, label]) => (
                <div key={label}>
                  <p className="font-[Space_Grotesk] text-xl font-bold text-[#C8862A]">{value}</p>
                  <p className={`mt-1 font-[JetBrains_Mono] text-[8px] uppercase tracking-[0.14em] ${subtle}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center animate-fade-up [animation-delay:140ms]">
            <div className="pointer-events-none absolute h-[330px] w-[330px] rounded-full bg-[#C8862A]/16 blur-3xl" />
            {featured ? (
              <a href={`#/book/${featured.slug}`} className="group relative no-underline">
                <BookCover book={featured} size="lg" rotate className="drop-shadow-2xl transition-all duration-300 group-hover:rotate-0 group-hover:scale-[1.025]" />
                <span className={`absolute -right-5 top-7 rounded-full border px-3 py-1.5 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.13em] shadow-xl ${dark ? 'border-white/10 bg-[#131A26] text-[#E0B27A]' : 'border-[#0E1420]/10 bg-white text-[#8A5B18]'}`}>{featured.type === 'free' ? 'Free edition' : money(featured)}</span>
              </a>
            ) : (
              <div className={`grid h-[330px] w-[230px] place-items-center rounded-2xl border border-dashed ${dark ? 'border-white/20' : 'border-[#0E1420]/20'}`}><p className={`px-7 text-center font-[JetBrains_Mono] text-[10px] uppercase tracking-wider ${subtle}`}>New titles are in production</p></div>
            )}
          </div>
        </div>
      </section>

      <section id="standard" className="scroll-mt-20 bg-[#0E1420] py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">{settings.manifestoEyebrow}</p>
          <h2 className="mt-4 max-w-2xl font-[Space_Grotesk] text-[29px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[42px]">{settings.manifestoHeading}</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-3">
            {settings.manifestoCards.map(card => (
              <article key={`${card.number}-${card.title}`} className="bg-[#0E1420] p-8 transition-colors hover:bg-[#131B2A] md:p-9">
                <p className="font-[JetBrains_Mono] text-[11px] font-bold tracking-[0.2em] text-[#C8862A]">{card.number}</p>
                <h3 className="mt-4 font-[Space_Grotesk] text-[19px] font-bold">{card.title}</h3>
                <p className="mt-3 text-[13.5px] leading-[1.72] text-white/60">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="catalogue" className={`scroll-mt-20 py-20 transition-colors ${dark ? 'bg-[#090D15]' : 'bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A]">{settings.catalogueEyebrow}</p><h2 className="mt-3 font-[Space_Grotesk] text-[32px] font-bold tracking-[-0.025em] md:text-[46px]">{settings.catalogueHeading}</h2></div>
            <p className={`max-w-sm text-[13.5px] leading-relaxed ${muted}`}>{published.length} title{published.length === 1 ? '' : 's'}. {settings.catalogueSummary}</p>
          </div>
          {published.length ? (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {published.map((book, index) => (
                <a key={book.id} href={`#/book/${book.slug}`} className={`group flex flex-col overflow-hidden rounded-3xl border no-underline shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${panel}`}>
                  <div className={`flex items-center justify-center px-6 py-10 ${dark ? 'bg-[#111824]' : index % 2 ? 'bg-[#EEF0EA]' : 'bg-[#F2EBDD]'}`}><BookCover book={book} size="md" rotate className="transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.035]" /></div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.13em] ${book.type === 'free' ? 'bg-emerald-500/12 text-emerald-500' : 'bg-[#C8862A]/12 text-[#C8862A]'}`}>{book.type === 'free' ? 'Free access' : money(book)}</span><span className={`font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.14em] ${subtle}`}>VOL-{String(index + 1).padStart(3, '0')}</span></div>
                    <h3 className="mt-4 font-[Space_Grotesk] text-[18px] font-bold leading-snug">{book.title}</h3>
                    <p className={`mt-2 line-clamp-3 flex-1 text-[13px] leading-[1.68] ${muted}`}>{book.subtitle}</p>
                    <div className={`mt-6 flex items-center justify-between border-t pt-4 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}><span className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.13em] ${subtle}`}>{book.author}</span><span className="inline-flex items-center gap-1 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">Open book <ArrowRight size={12} /></span></div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={`mt-12 rounded-3xl border border-dashed py-20 text-center ${dark ? 'border-white/15' : 'border-[#0E1420]/15'}`}><BookOpen className="mx-auto text-[#C8862A]" /><p className="mt-4 font-[Space_Grotesk] text-lg font-bold">The shelves are being stocked</p></div>
          )}
        </div>
      </section>

      <section id="founder" className={`scroll-mt-20 border-y py-20 md:py-24 ${dark ? 'border-white/10 bg-[#101722]' : 'border-[#0E1420]/10 bg-[#F2EBDD]'}`}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-[0.82fr_1.18fr]">
          <div className="relative mx-auto w-full max-w-[350px]">
            {settings.founderPhoto ? <img src={settings.founderPhoto} alt={settings.founderName} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-2xl" /> : <div className="grid aspect-[4/5] w-full place-items-center rounded-3xl bg-[#0E1420] font-[Space_Grotesk] text-7xl font-black text-[#C8862A] shadow-2xl">{settings.founderName.split(' ').map(name => name[0]).slice(0, 2).join('') || 'OS'}</div>}
            <div className={`absolute -bottom-5 -right-3 rounded-2xl border p-4 shadow-xl ${dark ? 'border-white/10 bg-[#192231]' : 'border-[#0E1420]/10 bg-white'}`}><p className="font-[Space_Grotesk] text-[14px] font-bold">{settings.founderName}</p><p className="mt-0.5 font-[JetBrains_Mono] text-[8.5px] font-semibold uppercase tracking-[0.15em] text-[#C8862A]">{settings.founderRole}</p></div>
          </div>
          <div>
            <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.26em] text-[#C8862A]">{settings.founderBadge}</p>
            <h2 className="mt-4 font-[Space_Grotesk] text-[30px] font-bold leading-[1.12] tracking-[-0.025em] md:text-[43px]">“{settings.founderQuote}”</h2>
            <div className={`mt-6 space-y-4 text-[14.5px] leading-[1.78] ${muted}`}><p>{settings.founderBioParagraph1}</p><p>{settings.founderBioParagraph2}</p></div>
            <div className={`mt-8 flex flex-wrap gap-2.5 border-t pt-6 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>{settings.founderTags.map(tag => <span key={tag} className={`rounded-full px-3.5 py-1.5 font-[JetBrains_Mono] text-[9px] font-semibold uppercase tracking-[0.12em] ${dark ? 'bg-white/8 text-white/65' : 'bg-[#0E1420] text-white'}`}>{tag}</span>)}</div>
          </div>
        </div>
      </section>

      <section className={`py-20 ${dark ? 'bg-[#090D15]' : 'bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden rounded-[32px] bg-[#0E1420] px-8 py-14 text-center text-white shadow-2xl md:px-16">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#C8862A]/18 blur-3xl" />
            <p className="relative font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8862A]">{settings.contactEyebrow}</p>
            <h2 className="relative mx-auto mt-4 max-w-xl font-[Space_Grotesk] text-[29px] font-bold leading-[1.15] md:text-[39px]">{settings.newsletterHeading}</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-[14px] leading-[1.7] text-white/60">{settings.newsletterSubtitle}</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <a href={`https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hi Nexa Growth Studio, I have an enquiry about your books.')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#C8862A] px-6 py-3.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] text-[#0E1420] no-underline transition-transform hover:-translate-y-0.5"><MessageCircle size={14} /> {settings.contactWhatsappCta}</a>
              <a href={`mailto:${settings.officialEmail}`} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] text-white no-underline transition-colors hover:bg-white/8"><Mail size={14} /> {settings.contactEmailCta}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className={`border-t py-10 ${dark ? 'border-white/10 bg-[#070A10]' : 'border-[#0E1420]/10 bg-white'}`}>
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-7 px-5 md:flex-row md:items-center">
          <div className="flex items-center gap-3"><BrandLogo settings={settings} dark={dark} size="sm" /><div><p className="font-[Space_Grotesk] text-[14px] font-bold">{settings.studioName}</p><p className={`font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.18em] ${subtle}`}>{settings.location}</p></div></div>
          <div className="flex flex-wrap items-center gap-5">
            {settings.generalBooksUrl ? <a href={settings.generalBooksUrl} target="_blank" rel="noreferrer" className={`font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.13em] no-underline hover:text-[#C8862A] ${muted}`}>{settings.generalBooksLabel || 'General Books'} ↗</a> : null}
            <a href={`mailto:${settings.officialEmail}`} className={`font-[JetBrains_Mono] text-[9.5px] no-underline hover:text-[#C8862A] ${muted}`}>{settings.officialEmail}</a>
            <ThemeToggle dark={dark} onToggle={() => setPublicTheme(dark ? 'light' : 'dark')} />
          </div>
        </div>
        <div className={`mx-auto mt-7 max-w-6xl border-t px-5 pt-5 font-[JetBrains_Mono] text-[8.5px] tracking-wide ${dark ? 'border-white/10 text-white/30' : 'border-[#0E1420]/10 text-[#0E1420]/40'}`}>© {new Date().getFullYear()} {settings.copyrightText}</div>
      </footer>
    </div>
  );
}
import type { Book, SiteSettings } from '../types';
import BookCover from './BookCover';

interface Props {
  books: Book[];
  settings: SiteSettings;
}

const OCHRE = '#C8862A';

const money = (book: Book) =>
  `${book.payment?.currency || '₦'}${(book.payment?.price ?? 0).toLocaleString()}`;

function Mark() {
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-black"
      style={{ background: '#0E1420', color: OCHRE }}
    >
      N
    </span>
  );
}

function Eyebrow({ children, tone = 'dark' }: { children: React.ReactNode; tone?: 'dark' | 'light' }) {
  return (
    <p
      className="font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.28em]"
      style={{ color: tone === 'light' ? OCHRE : 'rgba(14,20,32,0.45)' }}
    >
      {children}
    </p>
  );
}

export default function PublishingHome({ books, settings }: Props) {
  const published = books.filter(b => b.published !== false);
  const featured = published[0];

  return (
    <div className="min-h-screen font-[Inter] selection:bg-[#C8862A] selection:text-[#0E1420]" style={{ background: '#FAF7F2', color: '#0E1420' }}>
      {/* ─────────── Masthead ─────────── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: 'rgba(14,20,32,0.08)', background: 'rgba(250,247,242,0.92)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex items-center gap-3 no-underline">
            <Mark />
            <span className="leading-tight">
              <span className="block font-[Space_Grotesk] text-[15px] font-bold" style={{ color: '#0E1420' }}>
                {settings.studioName}
              </span>
              <span
                className="block font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.22em]"
                style={{ color: 'rgba(14,20,32,0.45)' }}
              >
                {settings.studioTagline}
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {[
              { label: 'Catalogue', href: '#catalogue' },
              { label: 'Standard', href: '#manifesto' },
              { label: 'The Founder', href: '#founder' },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="font-[JetBrains_Mono] text-[10.5px] font-semibold uppercase tracking-[0.16em] no-underline transition-colors"
                style={{ color: 'rgba(14,20,32,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.color = OCHRE)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,20,32,0.6)')}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href={featured ? `#/book/${featured.slug}` : '#catalogue'}
            className="rounded-full px-5 py-2 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-all hover:scale-105 active:scale-95 shadow-sm"
            style={{ background: OCHRE, color: '#0E1420' }}
          >
            Browse catalogue
          </a>
        </div>
      </header>

      {/* ─────────── Hero ─────────── */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'rgba(14,20,32,0.08)' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 340px at 12% -8%, rgba(200,134,42,0.14), transparent 65%), radial-gradient(700px 320px at 92% 8%, rgba(79,107,82,0.1), transparent 60%)',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <Eyebrow>{settings.heroKicker}</Eyebrow>

            <h1
              className="mt-5 font-[Space_Grotesk] text-[36px] font-bold leading-[1.06] tracking-[-0.025em] md:text-[60px]"
              style={{ color: '#0E1420' }}
            >
              {settings.heroTitle}
            </h1>

            <p className="mt-6 max-w-[32rem] text-[16px] leading-[1.72]" style={{ color: 'rgba(14,20,32,0.72)' }}>
              {settings.heroSubtitle}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <a
                href="#catalogue"
                className="rounded-full px-7 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{ background: '#0E1420', color: '#FAF7F2' }}
              >
                Explore Publications
              </a>
              <a
                href="#founder"
                className="rounded-full border px-6 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-colors"
                style={{ borderColor: 'rgba(14,20,32,0.2)', color: '#0E1420' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = OCHRE)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,20,32,0.2)')}
              >
                Meet the Founder
              </a>
            </div>

            <div
              className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t pt-6"
              style={{ borderColor: 'rgba(14,20,32,0.1)' }}
            >
              {[
                { n: String(published.length).padStart(2, '0'), l: 'Active Playbooks' },
                { n: '100%', l: 'African Realities' },
                { n: 'Direct', l: 'Instant Delivery' },
              ].map(stat => (
                <div key={stat.l}>
                  <p className="font-[Space_Grotesk] text-2xl font-bold" style={{ color: OCHRE }}>
                    {stat.n}
                  </p>
                  <p
                    className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(14,20,32,0.5)' }}
                  >
                    {stat.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Cover Display */}
          <div className="relative flex items-center justify-center">
            <div
              className="pointer-events-none absolute h-[320px] w-[320px] rounded-full blur-3xl md:h-[400px] md:w-[400px]"
              style={{ background: 'rgba(200,134,42,0.18)' }}
            />
            {featured ? (
              <div className="relative">
                <BookCover book={featured} size="lg" rotate className="drop-shadow-2xl hover:rotate-0 transition-transform duration-300" />
                <div
                  className="absolute -right-4 top-6 rounded-full px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em] shadow-lg backdrop-blur-md"
                  style={{ background: '#FAF7F2', color: '#0E1420', border: `1px solid rgba(14,20,32,0.12)` }}
                >
                  {featured.type === 'free' ? '★ Free Download' : `★ ${money(featured)}`}
                </div>
              </div>
            ) : (
              <div
                className="grid h-[300px] w-[220px] place-items-center rounded-2xl border border-dashed text-center"
                style={{ borderColor: 'rgba(14,20,32,0.2)' }}
              >
                <p className="px-5 font-[JetBrains_Mono] text-[10px] uppercase tracking-wider" style={{ color: 'rgba(14,20,32,0.4)' }}>
                  New titles in development
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────── Publishing Manifesto ─────────── */}
      <section id="manifesto" className="border-b py-20" style={{ borderColor: 'rgba(14,20,32,0.08)', background: '#0E1420' }}>
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow tone="light">{settings.manifestoEyebrow}</Eyebrow>
          <h2 className="mt-4 max-w-2xl font-[Space_Grotesk] text-[28px] font-bold leading-[1.14] tracking-[-0.015em] text-white md:text-[40px]">
            {settings.manifestoHeading}
          </h2>

          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl md:grid-cols-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {settings.manifestoCards.map(item => (
              <div key={item.number} className="p-8 md:p-9" style={{ background: '#0E1420' }}>
                <p className="font-[JetBrains_Mono] text-[12px] font-bold tracking-[0.2em]" style={{ color: OCHRE }}>
                  {item.number}
                </p>
                <h3 className="mt-4 font-[Space_Grotesk] text-[20px] font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── Catalogue ─────────── */}
      <section id="catalogue" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Published Titles</Eyebrow>
              <h2 className="mt-3 font-[Space_Grotesk] text-[32px] font-bold tracking-[-0.015em] md:text-[44px]">
                The Library
              </h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed" style={{ color: 'rgba(14,20,32,0.65)' }}>
              {published.length} publication{published.length === 1 ? '' : 's'} available. Delivered directly on WhatsApp or immediate download.
            </p>
          </div>

          {published.length === 0 ? (
            <div
              className="mt-12 rounded-3xl border border-dashed py-24 text-center"
              style={{ borderColor: 'rgba(14,20,32,0.18)' }}
            >
              <p className="font-[Space_Grotesk] text-[20px] font-bold">New editions being prepared</p>
              <p className="mt-2 text-[14px]" style={{ color: 'rgba(14,20,32,0.55)' }}>
                Titles are currently being finalized. Check back soon.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {published.map((book, i) => (
                <a
                  key={book.id}
                  href={`#/book/${book.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border bg-white no-underline transition-all duration-300 hover:-translate-y-1.5"
                  style={{ borderColor: 'rgba(14,20,32,0.09)', boxShadow: '0 2px 8px rgba(14,20,32,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 24px 48px -18px rgba(14,20,32,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(14,20,32,0.04)')}
                >
                  <div
                    className="relative flex items-center justify-center px-6 py-10"
                    style={{
                      background:
                        i % 3 === 0
                          ? 'linear-gradient(140deg, #F2EBDD, #EFE6D4)'
                          : i % 3 === 1
                            ? 'linear-gradient(140deg, #EEF0EA, #E7EBE2)'
                            : 'linear-gradient(140deg, #F5EEEA, #EFE4DD)',
                    }}
                  >
                    <BookCover
                      book={book}
                      size="md"
                      rotate
                      className="transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-3 py-1 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em]"
                        style={
                          book.type === 'free'
                            ? { background: 'rgba(79,107,82,0.12)', color: '#3E5A41' }
                            : { background: 'rgba(200,134,42,0.14)', color: '#8A5B18' }
                        }
                      >
                        {book.type === 'free' ? 'Free Access' : money(book)}
                      </span>
                      <span
                        className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em]"
                        style={{ color: 'rgba(14,20,32,0.4)' }}
                      >
                        VOL-{String(i + 1).padStart(3, '0')}
                      </span>
                    </div>

                    <h3 className="mt-4 font-[Space_Grotesk] text-[18px] font-bold leading-snug" style={{ color: '#0E1420' }}>
                      {book.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-[1.65]" style={{ color: 'rgba(14,20,32,0.65)' }}>
                      {book.subtitle}
                    </p>

                    <div
                      className="mt-6 flex items-center justify-between border-t pt-4"
                      style={{ borderColor: 'rgba(14,20,32,0.08)' }}
                    >
                      <span
                        className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.14em]"
                        style={{ color: 'rgba(14,20,32,0.5)' }}
                      >
                        {book.author}
                      </span>
                      <span
                        className="font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.12em] transition-transform duration-200 group-hover:translate-x-1"
                        style={{ color: OCHRE }}
                      >
                        Open playbook →
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────── The Mind Behind Nexa ─────────── */}
      <section id="founder" className="border-y py-20 md:py-28" style={{ borderColor: 'rgba(14,20,32,0.08)', background: '#F2EBDD' }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative">
            {settings.founderPhoto ? (
              <div className="relative overflow-hidden rounded-3xl shadow-xl border border-[rgba(14,20,32,0.12)]">
                <img
                  src={settings.founderPhoto}
                  alt={settings.founderName}
                  className="aspect-[4/5] w-full max-w-[380px] object-cover"
                />
              </div>
            ) : (
              <div
                className="grid aspect-[4/5] w-full max-w-[340px] place-items-center rounded-3xl font-[Space_Grotesk] text-[80px] font-black shadow-xl"
                style={{ background: '#0E1420', color: OCHRE }}
              >
                {settings.founderName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'OS'}
              </div>
            )}

            <div
              className="absolute -bottom-5 -right-2 sm:right-6 rounded-2xl px-5 py-4 shadow-xl backdrop-blur-md"
              style={{ background: '#FAF7F2', border: '1px solid rgba(14,20,32,0.12)' }}
            >
              <p className="font-[Space_Grotesk] text-[14px] font-bold text-[#0E1420]">{settings.founderName}</p>
              <p
                className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.16em] font-semibold mt-0.5"
                style={{ color: OCHRE }}
              >
                {settings.founderRole}
              </p>
            </div>
          </div>

          <div>
            <Eyebrow>{settings.founderBadge}</Eyebrow>
            <h2 className="mt-4 font-[Space_Grotesk] text-[30px] font-bold leading-[1.12] tracking-[-0.02em] md:text-[42px]">
              "{settings.founderQuote}"
            </h2>

            <div className="mt-6 space-y-4 text-[15px] leading-[1.75]" style={{ color: 'rgba(14,20,32,0.75)' }}>
              <p>{settings.founderBioParagraph1}</p>
              <p>{settings.founderBioParagraph2}</p>
            </div>

            <div
              className="mt-8 flex flex-wrap gap-2.5 border-t pt-6"
              style={{ borderColor: 'rgba(14,20,32,0.12)' }}
            >
              {settings.founderTags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full px-3.5 py-1.5 font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ background: '#0E1420', color: '#FAF7F2' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Direct Reachout & Inquiries ─────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div
            className="overflow-hidden rounded-3xl px-8 py-14 text-center md:px-16"
            style={{ background: 'linear-gradient(150deg, #16233B, #0E1420)' }}
          >
            <Eyebrow tone="light">Direct Publisher Dispatch</Eyebrow>
            <h2 className="mx-auto mt-4 max-w-xl font-[Space_Grotesk] text-[28px] font-bold leading-[1.16] text-white md:text-[38px]">
              {settings.newsletterHeading}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[14.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {settings.newsletterSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3.5">
              <a
                href="#catalogue"
                className="rounded-full px-7 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-all hover:scale-105 active:scale-95"
                style={{ background: OCHRE, color: '#0E1420' }}
              >
                Browse Playbooks
              </a>
              <a
                href={`https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${settings.founderName}, I would like to inquire about Nexa Growth Studio.`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-7 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline hover:bg-white/5 transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.25)', color: '#FAF7F2' }}
              >
                Message on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Footer ─────────── */}
      <footer className="border-t py-12" style={{ borderColor: 'rgba(14,20,32,0.08)' }}>
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <Mark />
              <div>
                <p className="font-[Space_Grotesk] text-[14px] font-bold">{settings.studioName}</p>
                <p
                  className="font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(14,20,32,0.45)' }}
                >
                  {settings.location}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-7 gap-y-2">
              {[
                { label: 'Catalogue', href: '#catalogue' },
                { label: 'Standard', href: '#manifesto' },
                { label: 'The Founder', href: '#founder' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-[JetBrains_Mono] text-[10.5px] uppercase tracking-[0.14em] no-underline"
                  style={{ color: 'rgba(14,20,32,0.55)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = OCHRE)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(14,20,32,0.55)')}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div
            className="mt-8 flex flex-col items-start justify-between gap-2 border-t pt-6 md:flex-row md:items-center"
            style={{ borderColor: 'rgba(14,20,32,0.08)' }}
          >
            <p className="font-[JetBrains_Mono] text-[9.5px] tracking-wide" style={{ color: 'rgba(14,20,32,0.45)' }}>
              © {new Date().getFullYear()} {settings.copyrightText}
            </p>
            <p className="font-[JetBrains_Mono] text-[9.5px] tracking-wide" style={{ color: 'rgba(14,20,32,0.45)' }}>
              Engineered by {settings.founderName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

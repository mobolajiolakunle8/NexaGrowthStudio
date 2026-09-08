import type { Book } from '../types';
import BookCover from './BookCover';

interface Props {
  books: Book[];
}

/* ─── Editorial design tokens ───────────────────────────────
   Ink #0E1420 · Paper #FAF7F2 · Ochre #C8862A · Clay #A8452F
   Sage #4F6B52 · Slate-blue #26364F                        */
const OCHRE = '#C8862A';

const money = (book: Book) =>
  `${book.payment?.currency || '₦'}${(book.payment?.price ?? 0).toLocaleString()}`;

function Mark({ light = false }: { light?: boolean }) {
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-black"
      style={
        light
          ? { background: OCHRE, color: '#0E1420' }
          : { background: '#0E1420', color: OCHRE }
      }
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

export default function PublishingHome({ books }: Props) {
  const published = books.filter(b => b.published !== false);
  const featured = published[0];
  const rest = published.slice(1);

  return (
    <div className="min-h-screen font-[Inter]" style={{ background: '#FAF7F2', color: '#0E1420' }}>
      {/* ─────────── Masthead ─────────── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: 'rgba(14,20,32,0.08)', background: 'rgba(250,247,242,0.88)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex items-center gap-3 no-underline">
            <Mark />
            <span className="leading-tight">
              <span className="block font-[Space_Grotesk] text-[15px] font-bold" style={{ color: '#0E1420' }}>
                Nexa Growth Studio
              </span>
              <span
                className="block font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.22em]"
                style={{ color: 'rgba(14,20,32,0.45)' }}
              >
                Independent Publishing
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {[
              { label: 'Catalogue', href: '#catalogue' },
              { label: 'About', href: '#about' },
              { label: 'Author', href: '#author' },
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
            className="rounded-full px-4 py-2 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-transform hover:-translate-y-0.5"
            style={{ background: OCHRE, color: '#0E1420' }}
          >
            Browse books
          </a>
        </div>
      </header>

      {/* ─────────── Hero ─────────── */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: 'rgba(14,20,32,0.08)' }}>
        {/* soft washes */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 340px at 12% -8%, rgba(200,134,42,0.13), transparent 65%), radial-gradient(700px 320px at 92% 8%, rgba(79,107,82,0.1), transparent 60%)',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <Eyebrow>Ibadan · Nigeria · Est. 2024</Eyebrow>

            <h1
              className="mt-5 font-[Space_Grotesk] text-[38px] font-bold leading-[1.05] tracking-[-0.02em] md:text-[62px]"
              style={{ color: '#0E1420' }}
            >
              Books that teach
              <br />
              business{' '}
              <span className="relative inline-block">
                <span style={{ color: OCHRE }}>properly.</span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="10"
                  viewBox="0 0 220 10"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d="M2 7C60 2 160 2 218 6" stroke={OCHRE} strokeWidth="2.5" strokeLinecap="round" opacity="0.45" />
                </svg>
              </span>
            </h1>

            <p className="mt-6 max-w-[30rem] text-[16px] leading-[1.72]" style={{ color: 'rgba(14,20,32,0.7)' }}>
              We publish practical, field-tested guides for African founders and small-business
              owners. No theory for theory's sake — just clear playbooks you can apply the same week
              you read them.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#catalogue"
                className="rounded-full px-6 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-transform hover:-translate-y-0.5"
                style={{ background: '#0E1420', color: '#FAF7F2' }}
              >
                View the catalogue
              </a>
              <a
                href="#about"
                className="rounded-full border px-6 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-colors"
                style={{ borderColor: 'rgba(14,20,32,0.18)', color: '#0E1420' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = OCHRE)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(14,20,32,0.18)')}
              >
                Why we publish
              </a>
            </div>

            {/* proof strip */}
            <div
              className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t pt-6"
              style={{ borderColor: 'rgba(14,20,32,0.1)' }}
            >
              {[
                { n: String(published.length).padStart(2, '0'), l: 'Titles in print' },
                { n: '100%', l: 'Field-tested' },
                { n: '₦', l: 'Accessible pricing' },
              ].map(stat => (
                <div key={stat.l}>
                  <p className="font-[Space_Grotesk] text-2xl font-bold" style={{ color: OCHRE }}>
                    {stat.n}
                  </p>
                  <p
                    className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(14,20,32,0.5)' }}
                  >
                    {stat.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* featured cover art */}
          <div className="relative flex items-center justify-center">
            <div
              className="pointer-events-none absolute h-[300px] w-[300px] rounded-full blur-3xl md:h-[380px] md:w-[380px]"
              style={{ background: 'rgba(200,134,42,0.16)' }}
            />
            {featured ? (
              <div className="relative">
                <BookCover book={featured} size="lg" rotate />
                {/* floating badge */}
                <div
                  className="absolute -right-5 top-6 rounded-full px-3 py-1.5 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] shadow-lg"
                  style={{ background: '#FAF7F2', color: '#0E1420', border: `1px solid rgba(14,20,32,0.1)` }}
                >
                  {featured.type === 'free' ? '★ Free download' : `★ ${money(featured)}`}
                </div>
              </div>
            ) : (
              <div
                className="grid h-[300px] w-[220px] place-items-center rounded-lg border border-dashed text-center"
                style={{ borderColor: 'rgba(14,20,32,0.18)' }}
              >
                <p className="px-5 font-[JetBrains_Mono] text-[10px] uppercase tracking-wider" style={{ color: 'rgba(14,20,32,0.4)' }}>
                  New titles coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─────────── Manifesto ─────────── */}
      <section id="about" className="border-b py-20" style={{ borderColor: 'rgba(14,20,32,0.08)', background: '#0E1420' }}>
        <div className="mx-auto max-w-6xl px-5">
          <Eyebrow tone="light">Our publishing standard</Eyebrow>
          <h2 className="mt-5 max-w-2xl font-[Space_Grotesk] text-[28px] font-bold leading-[1.15] tracking-[-0.01em] text-white md:text-[40px]">
            Every title has to earn its place on this page.
          </h2>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl md:grid-cols-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
            {[
              {
                k: '01',
                t: 'Written from practice',
                d: 'Every playbook is built on real client work, real failures and real numbers — not recycled internet advice.',
              },
              {
                k: '02',
                t: 'Built for this market',
                d: 'Pricing in naira, Nigerian customer behaviour, local logistics. The realities you actually operate inside.',
              },
              {
                k: '03',
                t: 'Readable in one sitting',
                d: 'Short, structured and direct. Designed to be finished on a Sunday and applied on Monday morning.',
              },
            ].map(item => (
              <div key={item.k} className="p-8" style={{ background: '#0E1420' }}>
                <p className="font-[JetBrains_Mono] text-[11px] font-bold tracking-[0.2em]" style={{ color: OCHRE }}>
                  {item.k}
                </p>
                <h3 className="mt-4 font-[Space_Grotesk] text-[19px] font-bold text-white">{item.t}</h3>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  {item.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── Latest release spotlight ─────────── */}
      {featured && (
        <section className="border-b py-16" style={{ borderColor: 'rgba(14,20,32,0.08)' }}>
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <Eyebrow>Latest release</Eyebrow>
              <span
                className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.18em]"
                style={{ color: 'rgba(14,20,32,0.38)' }}
              >
                NGS-001
              </span>
            </div>

            <a
              href={`#/book/${featured.slug}`}
              className="group mt-6 grid items-center gap-9 rounded-3xl border p-7 no-underline transition-all duration-300 md:grid-cols-[auto_1fr_auto] md:p-9"
              style={{ borderColor: 'rgba(14,20,32,0.1)', background: '#FFFFFF' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 24px 48px -24px rgba(14,20,32,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <BookCover
                book={featured}
                size="sm"
                className="transition-transform duration-300 group-hover:scale-[1.05]"
              />

              <div>
                <h3
                  className="font-[Space_Grotesk] text-[22px] font-bold leading-tight md:text-[27px]"
                  style={{ color: '#0E1420' }}
                >
                  {featured.title}
                </h3>
                <p className="mt-2.5 max-w-lg text-[14px] leading-[1.68]" style={{ color: 'rgba(14,20,32,0.62)' }}>
                  {featured.subtitle}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={
                      featured.type === 'free'
                        ? { background: 'rgba(79,107,82,0.12)', color: '#3E5A41' }
                        : { background: 'rgba(200,134,42,0.14)', color: '#8A5B18' }
                    }
                  >
                    {featured.type === 'free' ? 'Free download' : money(featured)}
                  </span>
                  <span
                    className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em]"
                    style={{ color: 'rgba(14,20,32,0.4)' }}
                  >
                    {featured.author}
                  </span>
                </div>
              </div>

              <span
                className="hidden rounded-full px-5 py-3 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-transform group-hover:-translate-y-0.5 md:block"
                style={{ background: OCHRE, color: '#0E1420' }}
              >
                Open title →
              </span>
            </a>
          </div>
        </section>
      )}

      {/* ─────────── Catalogue ─────────── */}
      <section id="catalogue" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>The collection</Eyebrow>
              <h2 className="mt-4 font-[Space_Grotesk] text-[30px] font-bold tracking-[-0.01em] md:text-[42px]">
                Current catalogue
              </h2>
            </div>
            <p className="max-w-sm text-[14px] leading-relaxed" style={{ color: 'rgba(14,20,32,0.6)' }}>
              {published.length} title{published.length === 1 ? '' : 's'} available. Instant delivery
              by download or WhatsApp.
            </p>
          </div>

          {published.length === 0 ? (
            <div
              className="mt-12 rounded-2xl border border-dashed py-24 text-center"
              style={{ borderColor: 'rgba(14,20,32,0.16)' }}
            >
              <p className="font-[Space_Grotesk] text-[19px] font-bold">The shelves are being stocked</p>
              <p className="mt-2 text-[14px]" style={{ color: 'rgba(14,20,32,0.55)' }}>
                Our first titles are in final editing. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {published.map((book, i) => (
                <a
                  key={book.id}
                  href={`#/book/${book.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white no-underline transition-all duration-300 hover:-translate-y-1.5"
                  style={{ borderColor: 'rgba(14,20,32,0.09)', boxShadow: '0 1px 2px rgba(14,20,32,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px -18px rgba(14,20,32,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(14,20,32,0.04)')}
                >
                  <div
                    className="relative flex items-center justify-center px-6 py-9"
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

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-2.5 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em]"
                        style={
                          book.type === 'free'
                            ? { background: 'rgba(79,107,82,0.12)', color: '#3E5A41' }
                            : { background: 'rgba(200,134,42,0.14)', color: '#8A5B18' }
                        }
                      >
                        {book.type === 'free' ? 'Free' : money(book)}
                      </span>
                      <span
                        className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em]"
                        style={{ color: 'rgba(14,20,32,0.38)' }}
                      >
                        NGS-{String(i + 1).padStart(3, '0')}
                      </span>
                    </div>

                    <h3 className="mt-3.5 font-[Space_Grotesk] text-[17px] font-bold leading-snug" style={{ color: '#0E1420' }}>
                      {book.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-[1.65]" style={{ color: 'rgba(14,20,32,0.6)' }}>
                      {book.subtitle}
                    </p>

                    <div
                      className="mt-5 flex items-center justify-between border-t pt-4"
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
                        Read more →
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <p
              className="mt-10 text-center font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.2em]"
              style={{ color: 'rgba(14,20,32,0.4)' }}
            >
              More titles in production for 2026
            </p>
          )}
        </div>
      </section>

      {/* ─────────── Author / Studio ─────────── */}
      <section id="author" className="border-y py-20" style={{ borderColor: 'rgba(14,20,32,0.08)', background: '#F2EBDD' }}>
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative">
            <div
              className="grid aspect-square w-full max-w-[320px] place-items-center rounded-2xl font-[Space_Grotesk] text-[64px] font-black"
              style={{ background: '#0E1420', color: OCHRE }}
            >
              OS
            </div>
            <div
              className="absolute -bottom-4 -right-3 rounded-xl px-4 py-3 shadow-lg"
              style={{ background: '#FAF7F2', border: '1px solid rgba(14,20,32,0.1)' }}
            >
              <p className="font-[Space_Grotesk] text-[13px] font-bold">Olakunle Samuel</p>
              <p
                className="font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.16em]"
                style={{ color: 'rgba(14,20,32,0.45)' }}
              >
                Publisher & Author
              </p>
            </div>
          </div>

          <div>
            <Eyebrow>From the publisher</Eyebrow>
            <h2 className="mt-4 font-[Space_Grotesk] text-[28px] font-bold leading-[1.15] tracking-[-0.01em] md:text-[38px]">
              We write the books we wish we had when we started.
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-[1.75]" style={{ color: 'rgba(14,20,32,0.7)' }}>
              <p>
                Nexa Growth Studio began in Ibadan with a simple frustration: most business books
                sold in Nigeria were written for other economies. The advice didn't survive contact
                with the market.
              </p>
              <p>
                So we started publishing our own — researched locally, tested with real businesses,
                and written in plain language that respects your time.
              </p>
            </div>

            <div
              className="mt-8 flex flex-wrap gap-6 border-t pt-6"
              style={{ borderColor: 'rgba(14,20,32,0.12)' }}
            >
              {['Business strategy', 'Sales & marketing', 'Brand & operations'].map(tag => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1.5 font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.14em]"
                  style={{ background: 'rgba(14,20,32,0.06)', color: 'rgba(14,20,32,0.6)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Newsletter / CTA ─────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div
            className="overflow-hidden rounded-3xl px-8 py-14 text-center md:px-16"
            style={{ background: 'linear-gradient(150deg, #16233B, #0E1420)' }}
          >
            <Eyebrow tone="light">Stay in the loop</Eyebrow>
            <h2 className="mx-auto mt-4 max-w-xl font-[Space_Grotesk] text-[27px] font-bold leading-[1.18] text-white md:text-[36px]">
              Be first to read every new title.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
              New playbooks, free chapters and practical business notes — a short letter, a few times
              a year. No noise.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#catalogue"
                className="rounded-full px-7 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-transform hover:-translate-y-0.5"
                style={{ background: OCHRE, color: '#0E1420' }}
              >
                Explore the books
              </a>
              <a
                href={`https://wa.me/2349030192034?text=${encodeURIComponent("Hi Nexa Growth Studio, I'd like to hear about new releases.")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border px-7 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline"
                style={{ borderColor: 'rgba(255,255,255,0.22)', color: '#FAF7F2' }}
              >
                Contact us
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
                <p className="font-[Space_Grotesk] text-[14px] font-bold">Nexa Growth Studio</p>
                <p
                  className="font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(14,20,32,0.45)' }}
                >
                  Ibadan, Nigeria
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-7 gap-y-2">
              {[
                { label: 'Catalogue', href: '#catalogue' },
                { label: 'About', href: '#about' },
                { label: 'Author', href: '#author' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] no-underline"
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
            className="mt-9 flex flex-col items-start justify-between gap-2 border-t pt-6 md:flex-row md:items-center"
            style={{ borderColor: 'rgba(14,20,32,0.08)' }}
          >
            <p className="font-[JetBrains_Mono] text-[9.5px] tracking-wide" style={{ color: 'rgba(14,20,32,0.42)' }}>
              © {new Date().getFullYear()} Nexa Growth Studio. All rights reserved.
            </p>
            <p className="font-[JetBrains_Mono] text-[9.5px] tracking-wide" style={{ color: 'rgba(14,20,32,0.42)' }}>
              Published from Ibadan · Olakunle Samuel
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState } from 'react';
import type { Book, SiteSettings } from '../types';
import BookCover from './BookCover';

interface Props {
  books: Book[];
  settings: SiteSettings;
}

const WINE = '#8A2846';
const WINE_DARK = '#1F0B13';
const LINEN = '#FAF6F4';

const money = (book: Book) =>
  `${book.payment?.currency || '₦'}${(book.payment?.price ?? 0).toLocaleString()}`;

export default function GeneralPressHome({ books, settings }: Props) {
  // Books belonging to the General imprint (or marked category === 'general')
  const generalBooks = books.filter(b => (b.category === 'general' || b.slug.includes('general')) && b.published !== false);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Available genres
  const genres = ['All', 'Fiction', 'Memoir & Biography', 'Life & Faith', 'Poetry', 'Culture & Society', 'Personal Growth'];

  const filtered = selectedGenre === 'All'
    ? generalBooks
    : generalBooks.filter(b => b.genre?.toLowerCase() === selectedGenre.toLowerCase());

  const featured = generalBooks[0];

  return (
    <div className="min-h-screen font-[Inter] selection:bg-[#E5A99B] selection:text-[#1F0B13]" style={{ background: LINEN, color: WINE_DARK }}>
      {/* ────────── Top Cross-Site Switcher Bar ────────── */}
      <div className="border-b border-[#8A2846]/15 bg-[#1F0B13] text-[#FAF6F4] px-5 py-2.5 text-xs font-[JetBrains_Mono]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#E5A99B] animate-pulse" />
            <span className="text-[11px] text-white/80">You are browsing: <strong className="text-[#E5A99B]">Nexa General Press</strong> (Literature &amp; General Books)</span>
          </div>
          <a
            href="#/"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF6F4]/10 hover:bg-[#FAF6F4]/20 text-[#FAF6F4] px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-wider transition-colors no-underline border border-white/15"
          >
            <span>← Switch to Nexa Business Books</span>
          </a>
        </div>
      </div>

      {/* ────────── Masthead ────────── */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: 'rgba(31,11,19,0.08)', background: 'rgba(250,246,244,0.94)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/general" className="flex items-center gap-3 no-underline">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[15px] font-black"
              style={{ background: WINE, color: '#FAF6F4' }}
            >
              N
            </span>
            <span className="leading-tight">
              <span className="block font-[Space_Grotesk] text-[15px] font-bold" style={{ color: WINE_DARK }}>
                {settings.generalPressName || 'Nexa General Press'}
              </span>
              <span
                className="block font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.22em]"
                style={{ color: WINE }}
              >
                {settings.generalPressTagline || 'Literature, Memoirs & Contemporary Voices'}
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            <a href="#general-catalogue" className="font-[JetBrains_Mono] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#1F0B13]/70 hover:text-[#8A2846] transition-colors no-underline">
              Browse Books
            </a>
            <a href="#submissions" className="font-[JetBrains_Mono] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#1F0B13]/70 hover:text-[#8A2846] transition-colors no-underline">
              Manuscripts
            </a>
            <a href="#about-press" className="font-[JetBrains_Mono] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#1F0B13]/70 hover:text-[#8A2846] transition-colors no-underline">
              About the Imprint
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href="#/"
              className="hidden sm:inline-flex rounded-full border border-[#8A2846]/25 px-3.5 py-1.5 font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A2846] hover:bg-[#8A2846]/10 transition-colors no-underline"
            >
              Business Imprint
            </a>
            <a
              href="#general-catalogue"
              className="rounded-full px-4 py-2 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] no-underline transition-all hover:scale-105 active:scale-95 shadow-sm"
              style={{ background: WINE, color: '#FAF6F4' }}
            >
              The Library
            </a>
          </div>
        </div>
      </header>

      {/* ────────── Hero Section ────────── */}
      <section className="relative overflow-hidden border-b border-[#8A2846]/10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 340px at 15% -8%, rgba(138,40,70,0.12), transparent 65%), radial-gradient(700px 320px at 85% 12%, rgba(229,169,155,0.2), transparent 60%)',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8A2846]/25 bg-[#8A2846]/10 px-3.5 py-1 text-[10px] font-[JetBrains_Mono] font-semibold uppercase tracking-[0.22em] text-[#8A2846] mb-4">
              <span>Literature · Thought · Memoir · Contemporary Press</span>
            </div>

            <h1
              className="font-[Space_Grotesk] text-[36px] font-bold leading-[1.06] tracking-[-0.025em] md:text-[58px]"
              style={{ color: WINE_DARK }}
            >
              {settings.generalPressHeading || 'Stories, Memoirs & Ideas Beyond Business.'}
            </h1>

            <p className="mt-6 max-w-[32rem] text-[16px] leading-[1.72] text-[#1F0B13]/75">
              {settings.generalPressSubtitle || 'From memoirs and creative non-fiction to cultural essays, faith, poetry, and lifestyle. A dedicated imprint for powerful African storytelling and thought-provoking books.'}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#general-catalogue"
                className="rounded-full px-7 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-all hover:scale-105 active:scale-95 shadow-md"
                style={{ background: WINE, color: '#FAF6F4' }}
              >
                Browse General Books
              </a>
              <a
                href="#/"
                className="rounded-full border border-[#1F0B13]/25 px-6 py-3.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] no-underline transition-colors text-[#1F0B13] hover:border-[#8A2846]"
              >
                Looking for Business Books? →
              </a>
            </div>

            {/* Quick Stats */}
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#8A2846]/15 pt-6">
              {[
                { n: String(generalBooks.length).padStart(2, '0'), l: 'General Titles' },
                { n: 'Multiple', l: 'Genres & Imprints' },
                { n: 'Digital', l: 'Direct Fulfillment' },
              ].map(stat => (
                <div key={stat.l}>
                  <p className="font-[Space_Grotesk] text-2xl font-bold text-[#8A2846]">{stat.n}</p>
                  <p className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.18em] text-[#1F0B13]/55">{stat.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Cover Card */}
          <div className="relative flex items-center justify-center">
            <div
              className="pointer-events-none absolute h-[320px] w-[320px] rounded-full blur-3xl md:h-[400px] md:w-[400px]"
              style={{ background: 'rgba(138,40,70,0.18)' }}
            />
            {featured ? (
              <div className="relative">
                <BookCover book={featured} size="lg" rotate className="drop-shadow-2xl hover:rotate-0 transition-transform duration-300" />
                <div
                  className="absolute -right-4 top-6 rounded-full px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em] shadow-lg backdrop-blur-md bg-white border border-[#8A2846]/20 text-[#8A2846]"
                >
                  {featured.type === 'free' ? '★ Free Download' : `★ ${money(featured)}`}
                </div>
              </div>
            ) : (
              <div className="grid h-[320px] w-[230px] place-items-center rounded-2xl border-2 border-dashed border-[#8A2846]/25 p-6 text-center bg-white/60 shadow-inner">
                <div>
                  <span className="text-4xl block mb-2">📖</span>
                  <p className="font-[Space_Grotesk] font-bold text-sm text-[#8A2846]">New Titles in Print</p>
                  <p className="font-[JetBrains_Mono] text-[10px] text-[#1F0B13]/60 uppercase tracking-wider mt-1">General publishing catalogue opening soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ────────── Genre / Category Pills Filter ────────── */}
      <section className="border-b border-[#8A2846]/10 bg-white/50 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto">
          <span className="font-[JetBrains_Mono] text-[10px] uppercase font-bold text-[#8A2846] mr-2 shrink-0">Filter Genre:</span>
          {genres.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`rounded-full px-3.5 py-1 text-xs font-[JetBrains_Mono] uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                selectedGenre === g
                  ? 'bg-[#8A2846] text-[#FAF6F4] font-bold shadow-sm'
                  : 'bg-[#8A2846]/10 text-[#1F0B13]/70 hover:bg-[#8A2846]/15'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* ────────── Catalogue Section ────────── */}
      <section id="general-catalogue" className="py-20 px-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <p className="font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8A2846]">General Catalogue</p>
              <h2 className="mt-2 font-[Space_Grotesk] text-[32px] font-bold tracking-[-0.015em] text-[#1F0B13] md:text-[42px]">
                Explore Our General Publications
              </h2>
            </div>
            <p className="max-w-sm text-[13.5px] leading-relaxed text-[#1F0B13]/70">
              {filtered.length} book{filtered.length !== 1 ? 's' : ''} available. Instant direct download or automated WhatsApp delivery.
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#8A2846]/25 p-16 text-center bg-white/70">
              <span className="text-4xl block mb-2">📚</span>
              <h3 className="font-[Space_Grotesk] font-bold text-lg text-[#1F0B13]">
                {generalBooks.length === 0
                  ? 'General Press Catalogue Opening Soon'
                  : `No books currently under "${selectedGenre}"`}
              </h3>
              <p className="text-xs text-[#1F0B13]/65 max-w-md mx-auto mt-2 leading-relaxed">
                {generalBooks.length === 0
                  ? 'We are currently accepting and preparing memoirs, fiction, cultural reflections, and personal growth books. You can add general books from the Mega Admin console.'
                  : 'Try selecting "All" above to explore other published works in the General Press.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <a
                  href="#/"
                  className="rounded-full bg-[#1F0B13] text-white text-xs font-[JetBrains_Mono] uppercase tracking-wider px-5 py-2.5 no-underline"
                >
                  View Business Books Catalogue →
                </a>
                <a
                  href="#submissions"
                  className="rounded-full border border-[#8A2846] text-[#8A2846] text-xs font-[JetBrains_Mono] uppercase tracking-wider px-5 py-2.5 no-underline hover:bg-[#8A2846]/10"
                >
                  Submit a Manuscript
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((book) => (
                <a
                  key={book.id}
                  href={`#/book/${book.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#8A2846]/15 bg-white no-underline transition-all duration-300 hover:-translate-y-1.5 shadow-sm hover:shadow-xl"
                >
                  <div className="relative flex items-center justify-center px-6 py-10 bg-gradient-to-br from-[#FAF6F4] via-[#F2E8E5] to-[#EBD9D5]">
                    <BookCover
                      book={book}
                      size="md"
                      rotate
                      className="transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full px-3 py-1 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em] bg-[#8A2846]/10 text-[#8A2846]">
                        {book.type === 'free' ? 'Free Reading' : money(book)}
                      </span>
                      {book.genre && (
                        <span className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] text-[#1F0B13]/50">
                          {book.genre}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 font-[Space_Grotesk] text-[18px] font-bold leading-snug text-[#1F0B13]">
                      {book.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-[1.65] text-[#1F0B13]/70">
                      {book.subtitle}
                    </p>

                    <div className="mt-6 flex items-center justify-between border-t border-[#8A2846]/10 pt-4">
                      <span className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.14em] text-[#1F0B13]/60">
                        {book.author}
                      </span>
                      <span className="font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A2846] transition-transform duration-200 group-hover:translate-x-1">
                        Get book →
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ────────── About the Press / Submissions ────────── */}
      <section id="submissions" className="border-y border-[#8A2846]/15 bg-white py-20 px-5">
        <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8A2846]">Publish With Us</p>
            <h2 className="mt-3 font-[Space_Grotesk] text-[30px] font-bold tracking-tight text-[#1F0B13] md:text-[40px]">
              Publishing diverse, powerful African books.
            </h2>
            <div className="space-y-4 text-[14.5px] text-[#1F0B13]/75 mt-5 leading-relaxed">
              <p>
                While <strong>Nexa Growth Studio</strong> focuses on rigorous commercial, brand, and operations playbooks for entrepreneurs, the <strong>Nexa General Press</strong> was born to give life to stories, reflections, memoirs, faith-inspired texts, poetry, and lifestyle literature.
              </p>
              <p>
                We believe stories shape cultures just as much as businesses drive economies. Whether you are an essayist, a memoirist, a thinker, or a first-time author, we offer independent, high-standard digital publishing.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`mailto:${settings.officialEmail}?subject=${encodeURIComponent('Manuscript Inquiry — Nexa General Press')}`}
                className="rounded-full bg-[#8A2846] text-[#FAF6F4] px-6 py-3 text-xs font-[JetBrains_Mono] font-bold uppercase tracking-wider no-underline hover:opacity-90"
              >
                Submit Manuscript via Email
              </a>
              <a
                href={`https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hi Nexa General Press, I would like to inquire about publishing a non-business book.')}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#8A2846] text-[#8A2846] px-6 py-3 text-xs font-[JetBrains_Mono] font-bold uppercase tracking-wider no-underline hover:bg-[#8A2846]/10"
              >
                Discuss on WhatsApp
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-[#1F0B13] text-[#FAF6F4] p-8 md:p-10 space-y-6">
            <h3 className="font-[Space_Grotesk] font-bold text-xl text-[#E5A99B]">What We Publish at the General Press</h3>
            <ul className="space-y-3.5 text-xs text-white/80 font-[Inter]">
              <li className="flex items-start gap-2.5">
                <span className="text-[#E5A99B] font-bold">✓</span>
                <span><strong>Memoirs &amp; Personal Narratives:</strong> Life lessons, African heritage, and transformative journeys.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#E5A99B] font-bold">✓</span>
                <span><strong>Thought &amp; Cultural Essays:</strong> Deep dives into modern African life, politics, and technology.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#E5A99B] font-bold">✓</span>
                <span><strong>Faith, Purpose &amp; Inspiration:</strong> Spiritual growth, philosophy, and purpose-driven living.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#E5A99B] font-bold">✓</span>
                <span><strong>Poetry, Anthologies &amp; Fiction:</strong> Compelling literary works crafted with modern publishing standards.</span>
              </li>
            </ul>

            <div className="border-t border-white/10 pt-4 text-[11px] text-white/50 font-mono">
              Inquiries: {settings.officialEmail}
            </div>
          </div>
        </div>
      </section>

      {/* ────────── Switch to Business Studio Banner ────────── */}
      <section className="py-16 px-5 bg-gradient-to-r from-[#1F0B13] via-[#2A101B] to-[#1F0B13] text-white">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.25em] text-[#E5A99B]">Looking for Commerce &amp; Strategy?</p>
          <h2 className="font-[Space_Grotesk] font-bold text-2xl md:text-3xl">Visit the Nexa Business Books Publishing House</h2>
          <p className="text-xs text-white/70 max-w-lg mx-auto leading-relaxed">
            Switch back to our core business studio for practical sales playbooks, pricing frameworks, and company growth guides for African founders.
          </p>
          <div className="pt-2">
            <a
              href="#/"
              className="inline-flex rounded-full bg-[#E5A99B] text-[#1F0B13] px-7 py-3 text-xs font-[JetBrains_Mono] font-bold uppercase tracking-wider no-underline hover:opacity-90 shadow-md"
            >
              ← Enter Nexa Business Books Studio
            </a>
          </div>
        </div>
      </section>

      {/* ────────── Footer ────────── */}
      <footer className="border-t border-[#8A2846]/15 bg-white py-10 px-5 text-xs text-[#1F0B13]/60">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 font-[JetBrains_Mono] text-[10px]">
          <p>© {new Date().getFullYear()} {settings.generalPressName || 'Nexa General Press'} · An imprint of Nexa Growth Studio</p>
          <div className="flex gap-4">
            <a href="#/" className="text-[#8A2846] hover:underline no-underline">Business Imprint</a>
            <a href="#/general" className="text-[#8A2846] hover:underline no-underline">General Press</a>
            <a href={`mailto:${settings.officialEmail}`} className="text-[#8A2846] hover:underline no-underline">{settings.officialEmail}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

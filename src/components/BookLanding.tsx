import { useState, useMemo } from 'react';
import type { Book, Lead, SiteSettings } from '../types';
import { generateId, isValidPhone, normalizePhoneForWA, downloadGuidePdf, saveLeads, loadLeads } from '../storage';
import { createLeadInCloud } from '../cloud';
import BookCover from './BookCover';

const isValidName = (v: string) => v.trim().length >= 2;
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface Props {
  book: Book;
  settings: SiteSettings;
  onAdminAccess: () => void;
}

export default function BookLanding({ book, settings, onAdminAccess }: Props) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name: string; email: string; phone: string } | null>(null);

  const formComplete = isValidName(name) && isValidEmail(email) && isValidPhone(phone);

  const fieldStatus = useMemo(() => ({
    name: name.length > 0 && !isValidName(name),
    email: email.length > 0 && !isValidEmail(email),
    phone: phone.length > 0 && !isValidPhone(phone),
  }), [name, email, phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formComplete) return;

    const nname = name.trim();
    const nemail = email.trim();
    const nphone = phone.trim();
    const userWA = normalizePhoneForWA(nphone);
    const adminWA = book.adminWhatsapp.replace(/[^\d]/g, '');

    setSubmitting(true);

    if (book.type === 'free') {
      downloadGuidePdf(nname, book);

      const thankYouMsg = [
        `🎉 Hi ${nname}!`,
        '',
        book.donation?.thankYouMessage || `Thank you for downloading "${book.title}"!`,
        '',
        book.donation ? `❤️ ${book.donation.donationMessage}` : '',
        book.donation ? '' : '',
        book.donation ? `🏦 Account Name: ${book.donation.accountName}` : '',
        book.donation ? `🔢 Account Number: ${book.donation.accountNumber}` : '',
        book.donation ? `🏛️ Bank: ${book.donation.bankName}` : '',
        '',
        `— ${book.author}, ${book.authorRole}`,
      ].filter(l => l !== undefined).join('\n');

      window.open(`https://wa.me/${userWA}?text=${encodeURIComponent(thankYouMsg)}`, '_blank');

      setTimeout(() => {
        const adminMsg = `📚 New Download: "${book.title}"\n\nName: ${nname}\nEmail: ${nemail}\nPhone: ${nphone}\nTime: ${new Date().toLocaleString()}`;
        window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(adminMsg)}`, '_blank');
      }, 1200);
    } else {
      const payMsg = [
        `💳 Payment Request for "${book.title}"`,
        '',
        `Name: ${nname}`,
        `Email: ${nemail}`,
        `Phone: ${nphone}`,
        '',
        `I would like to purchase this book.`,
        book.payment ? `Price: ${book.payment.currency || '₦'}${book.payment.price?.toLocaleString()}` : '',
        '',
        `Please confirm payment instructions. Thank you!`,
      ].join('\n');
      window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(payMsg)}`, '_blank');
    }

    const newLead: Lead = {
      id: generateId(),
      bookId: book.id,
      name: nname,
      email: nemail,
      phone: nphone,
      date: new Date().toISOString(),
      status: 'New',
      paid: book.type === 'paid' ? false : undefined,
    };
    const allLeads = [newLead, ...loadLeads()];
    saveLeads(allLeads);

    await createLeadInCloud(newLead).catch(error => {
      console.error('Lead cloud save failed:', error);
    });

    setResult({ name: nname, email: nemail, phone: nphone });
    setName('');
    setEmail('');
    setPhone('');
    setSubmitting(false);
    setSent(true);
  };

  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [adminErr, setAdminErr] = useState('');

  const handleAdminCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCode === book.adminPasscode) {
      onAdminAccess();
    } else {
      setAdminErr('Incorrect passcode for this book.');
    }
  };

  useMemo(() => {
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      if (hash === `admin/${book.slug}` || hash === `admin/book/${book.slug}`) {
        setPasscodeOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [book.slug]);

  const isFree = book.type === 'free';
  const priceDisplay = book.payment ? `${book.payment.currency || '₦'}${book.payment.price?.toLocaleString()}` : '';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0E1420] font-[Inter] flex flex-col justify-between selection:bg-[#C8862A] selection:text-[#0E1420]">
      <div>
        {/* Navigation bar */}
        <header className="border-b border-[rgba(14,20,32,0.08)] bg-[#FAF7F2]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
            <a href="#/" className="inline-flex items-center gap-2.5 text-xs font-[JetBrains_Mono] uppercase tracking-[0.18em] text-[#0E1420]/70 hover:text-[#C8862A] transition-colors no-underline">
              <span>← Nexa Growth Studio</span>
            </a>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-[JetBrains_Mono] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full ${
                isFree ? 'bg-[#4F6B52]/10 text-[#4F6B52]' : 'bg-[#C8862A]/15 text-[#9A6218]'
              }`}>
                {isFree ? 'Free Book' : priceDisplay}
              </span>
              <button
                onClick={() => setOpen(true)}
                className="hidden sm:inline-flex rounded-full bg-[#0E1420] px-4 py-1.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.14em] text-[#FAF7F2] hover:bg-[#C8862A] hover:text-[#0E1420] transition-colors"
              >
                {isFree ? 'Get free copy' : 'Order book'}
              </button>
            </div>
          </div>
        </header>

        {/* Hero Banner with Rich Warm Ink/Ochre Aesthetic */}
        <section className="relative overflow-hidden bg-[#0E1420] text-[#FAF7F2] px-6 pt-16 pb-24 md:pt-20 md:pb-32 border-b border-[#C8862A]/20">
          <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(#C8862A_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="pointer-events-none absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-[#C8862A]/15 blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8862A]/30 bg-[#C8862A]/10 px-3.5 py-1 text-[10px] font-[JetBrains_Mono] font-semibold uppercase tracking-[0.22em] text-[#C8862A] mb-5">
              <span>{book.kicker || (isFree ? 'Free Edition' : 'Published Edition')}</span>
            </div>

            <h1 className="font-[Space_Grotesk] font-bold text-[34px] sm:text-[46px] md:text-[56px] leading-[1.08] tracking-[-0.02em] max-w-3xl mx-auto text-white">
              {book.title}
            </h1>

            <p className="mt-5 text-[15px] sm:text-[17px] text-[#FAF7F2]/75 max-w-2xl mx-auto leading-[1.65]">
              {book.subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => { setSent(false); setResult(null); setOpen(true); }}
                className="rounded-full bg-[#C8862A] px-7 py-3.5 font-[JetBrains_Mono] text-xs font-bold uppercase tracking-[0.16em] text-[#0E1420] hover:scale-105 active:scale-95 transition-all shadow-[0_12px_32px_rgba(200,134,42,0.35)] cursor-pointer"
              >
                {isFree ? 'Get Free Instant Access →' : `Purchase Book — ${priceDisplay} →`}
              </button>
              <a
                href="#details"
                className="rounded-full border border-white/20 px-6 py-3.5 font-[JetBrains_Mono] text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] hover:bg-white/5 transition-colors no-underline"
              >
                Inspect Contents
              </a>
            </div>
          </div>
        </section>

        {/* Floating Book Cover Preview */}
        <div className="relative z-10 -mt-16 md:-mt-20 flex justify-center px-6">
          <div className="relative group">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-b from-[#C8862A]/30 to-transparent blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <BookCover book={book} size="lg" rotate className="hover:rotate-0 transition-transform duration-300 drop-shadow-2xl" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <main id="details" className="mx-auto max-w-3xl px-6 pt-16 pb-24">
          {/* Quick Specs Strip */}
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[rgba(14,20,32,0.08)] bg-white p-5 text-center shadow-sm mb-14">
            <div>
              <p className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-widest text-[#0E1420]/50">Format</p>
              <p className="font-[Space_Grotesk] font-bold text-sm text-[#0E1420] mt-1">Digital Book (PDF)</p>
            </div>
            <div className="border-x border-[rgba(14,20,32,0.08)]">
              <p className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-widest text-[#0E1420]/50">Access</p>
              <p className="font-[Space_Grotesk] font-bold text-sm text-[#0E1420] mt-1">{isFree ? 'Instant Free' : 'Verified Purchase'}</p>
            </div>
            <div>
              <p className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-widest text-[#0E1420]/50">Author</p>
              <p className="font-[Space_Grotesk] font-bold text-sm text-[#0E1420] mt-1 truncate px-1">{book.author}</p>
            </div>
          </div>

          {/* What's Inside */}
          <section className="mb-14">
            <div className="text-center mb-8">
              <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8862A]">What You Will Master</p>
              <h2 className="font-[Space_Grotesk] text-[26px] md:text-[32px] font-bold tracking-tight text-[#0E1420] mt-2">
                Designed to be applied the same week you read it.
              </h2>
            </div>

            <div className="space-y-3.5">
              {book.whatsInside.map((item, idx) => (
                <div key={idx} className="flex gap-4 rounded-2xl border border-[rgba(14,20,32,0.08)] bg-white p-5 shadow-sm transition-transform hover:-translate-y-0.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0E1420] text-[#C8862A] font-[JetBrains_Mono] text-xs font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-[14.5px] leading-[1.65] text-[#0E1420]/80 pt-0.5 font-medium">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Author / Origin Note */}
          <section className="rounded-2xl border border-[rgba(14,20,32,0.08)] bg-[#F2EBDD] p-7 md:p-9 mb-14">
            <p className="font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#C8862A]">Publishing Context</p>
            <h3 className="font-[Space_Grotesk] font-bold text-xl text-[#0E1420] mt-2">
              Written for the realities of doing business in Nigeria.
            </h3>
            <p className="text-[14px] leading-[1.7] text-[#0E1420]/75 mt-3">
              This publication is engineered by {book.author} at {book.authorRole}. It cuts out generic Western templates in favour of practical commercial realities, local customer behaviour, and realistic execution.
            </p>
          </section>

          {/* Call to action card */}
          <section className="rounded-3xl bg-[#0E1420] text-white p-8 md:p-12 text-center relative overflow-hidden shadow-xl">
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[#C8862A]/20 blur-3xl" />
            <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8862A] mb-2">{isFree ? 'Zero Strings Attached' : 'Instant Direct Fulfillment'}</p>
            <h2 className="font-[Space_Grotesk] font-bold text-[28px] md:text-[36px] text-white">
              {book.ctaTitle || (isFree ? 'Claim your free copy now' : 'Secure your book copy')}
            </h2>
            <p className="text-[14px] text-white/70 max-w-md mx-auto mt-3 leading-relaxed">
              {book.ctaSubtitle || (isFree ? 'Tap below and it is yours — read it at your pace with no follow-up required.' : 'Enter your details, confirm payment, and receive the direct download link instantly.')}
            </p>

            <button
              onClick={() => { setSent(false); setResult(null); setOpen(true); }}
              className="mt-8 rounded-full bg-[#C8862A] px-8 py-4 font-[JetBrains_Mono] text-xs font-bold uppercase tracking-[0.16em] text-[#0E1420] hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
            >
              {isFree ? 'Get Instant Download Link →' : `Order Book for ${priceDisplay} →`}
            </button>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[rgba(14,20,32,0.08)] bg-white py-8 px-6 text-center">
        <p className="font-[Space_Grotesk] font-bold text-sm text-[#0E1420]">{book.author}</p>
        <p className="font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.18em] text-[#0E1420]/50 mt-1">
          {book.authorRole} · Nexa Growth Studio
        </p>
      </footer>

      {/* Modal: Lead Generation / Purchase Form */}
      {open && (
        <div className="fixed inset-0 z-50 bg-[#0E1420]/80 backdrop-blur-sm flex items-center justify-center px-5 py-8 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="bg-[#FAF7F2] border border-[rgba(14,20,32,0.12)] text-[#0E1420] rounded-3xl p-7 md:p-9 max-w-md w-full shadow-2xl relative my-auto" onClick={e => e.stopPropagation()}>
            {sent && result ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#C8862A]/20 flex items-center justify-center text-[#C8862A] text-xl font-bold">✓</div>
                <h3 className="font-[Space_Grotesk] text-2xl font-bold text-[#0E1420] mb-2">
                  {isFree ? `You're all set, ${result.name}!` : `Order Submitted, ${result.name}!`}
                </h3>

                {isFree ? (
                  <>
                    <p className="text-sm text-[#0E1420]/75 mb-5 leading-relaxed">
                      {book.donation?.thankYouMessage || `Thank you for requesting "${book.title}". Your copy has been triggered.`}
                    </p>

                    {book.donation && (
                      <div className="rounded-2xl border border-[rgba(14,20,32,0.1)] bg-[#0E1420] text-[#FAF7F2] p-5 text-left mb-5 shadow-inner">
                        <p className="text-[#C8862A] font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.2em] mb-1">❤️ Appreciation & Support</p>
                        <p className="text-xs text-[#FAF7F2]/75 leading-relaxed mb-3.5">{book.donation.donationMessage}</p>
                        <div className="space-y-1.5 rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
                          <div className="flex justify-between"><span className="text-white/50 text-[10px] uppercase">Account</span><span className="font-semibold text-white">{book.donation.accountName}</span></div>
                          <div className="flex justify-between"><span className="text-white/50 text-[10px] uppercase">Number</span><span className="font-mono text-[#C8862A] font-bold">{book.donation.accountNumber}</span></div>
                          <div className="flex justify-between"><span className="text-white/50 text-[10px] uppercase">Bank</span><span className="font-semibold text-white">{book.donation.bankName}</span></div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5">
                      <button
                        onClick={() => downloadGuidePdf(result.name, book)}
                        className="w-full rounded-full bg-[#C8862A] text-[#0E1420] font-[JetBrains_Mono] font-bold text-xs py-3.5 hover:opacity-90 transition-opacity"
                      >
                        ⬇ Download PDF Directly
                      </button>
                      <a
                        href={`https://wa.me/${book.adminWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi, I just downloaded "${book.title}". Thank you!`)}`}
                        target="_blank" rel="noreferrer"
                        className="w-full rounded-full border border-[rgba(14,20,32,0.15)] bg-white text-[#0E1420] font-[JetBrains_Mono] font-bold text-xs py-3.5 text-center no-underline hover:bg-[#FAF7F2] transition-colors"
                      >
                        💬 Connect with Publisher on WhatsApp
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[#0E1420]/75 mb-5 leading-relaxed">
                      Your order is logged. Complete payment to receive your direct download link automatically on WhatsApp.
                    </p>
                    {book.payment && (
                      <div className="rounded-2xl border border-[rgba(14,20,32,0.1)] bg-[#0E1420] text-[#FAF7F2] p-5 text-left mb-5 shadow-inner">
                        <p className="text-[#C8862A] font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.2em] mb-1">💳 Transfer Details</p>
                        <p className="text-xs text-[#FAF7F2]/75 leading-relaxed mb-3.5">{book.payment.paymentNote}</p>
                        <div className="space-y-1.5 rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
                          <div className="flex justify-between"><span className="text-white/50 text-[10px] uppercase">Account</span><span className="font-semibold text-white">{book.payment.accountName}</span></div>
                          <div className="flex justify-between"><span className="text-white/50 text-[10px] uppercase">Number</span><span className="font-mono text-[#C8862A] font-bold">{book.payment.accountNumber}</span></div>
                          <div className="flex justify-between"><span className="text-white/50 text-[10px] uppercase">Bank</span><span className="font-semibold text-white">{book.payment.bankName}</span></div>
                          <div className="flex justify-between pt-2 border-t border-white/10"><span className="text-white/50 text-[10px] uppercase">Amount</span><span className="font-bold text-[#C8862A]">{priceDisplay}</span></div>
                        </div>
                      </div>
                    )}
                    <a
                      href={`https://wa.me/${book.adminWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi! I just paid for "${book.title}". Name: ${result.name}, Email: ${result.email}. Please verify and send download link.`)}`}
                      target="_blank" rel="noreferrer"
                      className="w-full rounded-full bg-[#25D366] text-white font-[JetBrains_Mono] font-bold text-xs py-3.5 text-center no-underline flex items-center justify-center hover:opacity-90 transition-opacity"
                    >
                      📲 Send Payment Proof on WhatsApp
                    </a>
                    <a
                      href={`mailto:${settings.officialEmail}?subject=${encodeURIComponent(`Payment proof: ${book.title}`)}&body=${encodeURIComponent(`Hello Nexa Growth Studio,\n\nI have completed payment for "${book.title}".\n\nName: ${result.name}\nEmail: ${result.email}\nWhatsApp: ${result.phone}\n\nMy payment proof is attached.`)}`}
                      className="mt-2 w-full rounded-full border border-[rgba(14,20,32,0.15)] bg-white text-[#0E1420] font-[JetBrains_Mono] font-bold text-xs py-3.5 text-center no-underline flex items-center justify-center hover:bg-[#F2EBDD] transition-colors"
                    >
                      ✉️ Send Payment Proof by Email
                    </a>
                    <p className="mt-3 text-[10px] text-[#0E1420]/55 font-mono">
                      Orders are also received at {settings.officialEmail}
                    </p>
                  </>
                )}

                <button onClick={() => { setOpen(false); setSent(false); setResult(null); }} className="mt-5 text-xs font-[JetBrains_Mono] text-[#0E1420]/50 hover:text-[#0E1420] underline">
                  Back to book
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#C8862A]">{isFree ? 'Instant Access' : 'Secure Order'}</p>
                  <h3 className="font-[Space_Grotesk] text-2xl font-bold text-[#0E1420] mt-1">
                    {isFree ? 'Download this book' : `Order "${book.title}"`}
                  </h3>
                  <p className="text-xs text-[#0E1420]/65 mt-1.5">
                    {isFree ? 'Enter your details below. The PDF is delivered to you immediately.' : `Enter your details to generate your order for ${priceDisplay}.`}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
                  <div>
                    <label className="text-[10px] font-[JetBrains_Mono] font-semibold text-[#0E1420]/70 uppercase tracking-wider block mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tunde Alao"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-3 text-sm focus:outline-none transition-colors ${
                        fieldStatus.name ? 'border-red-400 bg-red-50/50' : 'border-[rgba(14,20,32,0.15)] bg-white focus:border-[#C8862A]'
                      }`}
                    />
                    {fieldStatus.name && <p className="text-[10px] text-red-500 mt-1">Please enter at least 2 characters.</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-[JetBrains_Mono] font-semibold text-[#0E1420]/70 uppercase tracking-wider block mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. tunde@company.ng"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-3 text-sm focus:outline-none transition-colors ${
                        fieldStatus.email ? 'border-red-400 bg-red-50/50' : 'border-[rgba(14,20,32,0.15)] bg-white focus:border-[#C8862A]'
                      }`}
                    />
                    {fieldStatus.email && <p className="text-[10px] text-red-500 mt-1">Enter a valid email address.</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-[JetBrains_Mono] font-semibold text-[#0E1420]/70 uppercase tracking-wider block mb-1">WhatsApp Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+2349030192034 or 08123456789"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-3 text-sm focus:outline-none transition-colors ${
                        fieldStatus.phone ? 'border-red-400 bg-red-50/50' : 'border-[rgba(14,20,32,0.15)] bg-white focus:border-[#C8862A]'
                      }`}
                    />
                    {fieldStatus.phone && <p className="text-[10px] text-red-500 mt-1">Enter a complete phone number.</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={!formComplete || submitting}
                    className={`mt-2 rounded-full py-3.5 font-[JetBrains_Mono] text-xs font-bold uppercase tracking-[0.16em] transition-all cursor-pointer ${
                      formComplete
                        ? 'bg-[#C8862A] text-[#0E1420] hover:scale-[1.02] active:scale-98 shadow-md'
                        : 'bg-[rgba(14,20,32,0.12)] text-[#0E1420]/40 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? 'Delivering...' : isFree ? 'Get Instant Access →' : `Proceed to Pay ${priceDisplay} →`}
                  </button>
                  {!formComplete && <p className="text-[10px] text-[#0E1420]/50 text-center">Fill all fields to unlock</p>}
                </form>
              </>
            )}

            <button
              onClick={() => { setOpen(false); setSent(false); setResult(null); }}
              className="absolute top-5 right-5 text-[#0E1420]/40 hover:text-[#0E1420] text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Secret Book Admin Passcode Modal */}
      {passcodeOpen && (
        <div className="fixed inset-0 z-50 bg-[#0E1420]/80 backdrop-blur-sm flex items-center justify-center px-6" onClick={() => setPasscodeOpen(false)}>
          <div className="bg-[#0E1420] border border-[#C8862A]/30 text-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <p className="font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.2em] text-[#C8862A]">Book Management</p>
            <h3 className="font-[Space_Grotesk] text-lg font-bold text-white mt-1">Unlock "{book.title}"</h3>
            <p className="text-xs text-white/60 mt-1 mb-4">Enter this book's dedicated admin passcode.</p>
            <form onSubmit={handleAdminCheck} className="flex flex-col gap-3">
              <input
                required
                type="password"
                placeholder="Enter passcode"
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-center font-mono text-white focus:outline-none focus:border-[#C8862A]"
                autoFocus
              />
              {adminErr && <p className="text-xs text-red-400 text-center">{adminErr}</p>}
              <button type="submit" className="rounded-full bg-[#C8862A] py-3 text-xs font-[JetBrains_Mono] font-bold uppercase tracking-wider text-[#0E1420] hover:opacity-90">
                Unlock Dashboard
              </button>
            </form>
            <button onClick={() => setPasscodeOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

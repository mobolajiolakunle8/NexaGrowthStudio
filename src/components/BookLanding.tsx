import { useMemo, useState } from 'react';
import type { Book, Lead } from '../types';
import { generateId, isValidPhone, normalizePhoneForWA, downloadGuidePdf, saveLeads, loadLeads } from '../storage';
import BookCover from './BookCover';

const isValidName = (v: string) => v.trim().length >= 2;
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

interface Props {
  book: Book;
  onAdminAccess: () => void;
}

export default function BookLanding({ book, onAdminAccess }: Props) {
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

  const inputClass = (invalid: boolean) =>
    `w-full pl-4 pr-10 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 text-[#1C1B1F] transition ${
      invalid ? 'border-red-300 focus:ring-red-300 bg-red-50' : 'border-gray-200 focus:ring-[#C9A227] bg-white'
    }`;

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
      // Download PDF immediately
      downloadGuidePdf(nname, book);

      // Send thank-you + donation info to user's WhatsApp
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

      // Notify admin
      setTimeout(() => {
        const adminMsg = `📚 New Download: "${book.title}"\n\nName: ${nname}\nEmail: ${nemail}\nPhone: ${nphone}\nTime: ${new Date().toLocaleString()}`;
        window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(adminMsg)}`, '_blank');
      }, 1200);
    } else {
      // Paid book — open user's WA to admin with payment intent
      const payMsg = [
        `💳 Payment for "${book.title}"`,
        '',
        `Name: ${nname}`,
        `Email: ${nemail}`,
        `Phone: ${nphone}`,
        '',
        `I'd like to purchase this book.`,
        book.payment ? `Price: ${book.payment.currency || '₦'}${book.payment.price}` : '',
        '',
        `Please confirm payment details. Thank you!`,
      ].join('\n');
      window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(payMsg)}`, '_blank');
    }

    // Save lead
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

    setResult({ name: nname, email: nemail, phone: nphone });
    setName(''); setEmail(''); setPhone('');
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
      setAdminErr('Incorrect passcode.');
    }
  };

  // Hash-based admin access for this book
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

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#1C1B1F] font-[Inter] flex flex-col justify-between">
      {/* Hero */}
      <div>
        <section className="bg-[#152447] px-6 pt-[56px] pb-[70px] text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600 opacity-70" />
          <p className="font-[JetBrains_Mono] text-[11px] tracking-[2.4px] uppercase text-[#C9A227] mb-4">{book.kicker}</p>
          <h1 className="font-[Space_Grotesk] font-bold text-[30px] md:text-[38px] text-white max-w-[600px] mx-auto leading-[1.22]">{book.title}</h1>
          <p className="text-[15px] md:text-[16px] text-[#C7CCDA] max-w-[460px] mx-auto mt-[18px] leading-[1.6]">{book.subtitle}</p>
          {!isFree && book.payment && (
            <div className="inline-flex items-center gap-2 bg-amber-500 text-slate-950 font-bold text-lg px-6 py-2 rounded-full mt-5">
              {book.payment.currency || '₦'}{book.payment.price?.toLocaleString()}
            </div>
          )}
        </section>

        {/* Book Cover */}
        <div className="flex justify-center -mt-[52px] mb-[44px] px-6 relative z-10">
          <BookCover book={book} size="md" rotate />
        </div>

        {/* Content */}
        <main className="max-w-[520px] mx-auto px-6 pb-[70px]">
          <section className="mb-9">
            <h3 className="font-[JetBrains_Mono] font-semibold text-[11px] tracking-[1.6px] uppercase text-[#152447] mb-4 text-center">What's Inside</h3>
            <div className="flex flex-col gap-3">
              {book.whatsInside.map((text, i) => (
                <div key={i} className="flex gap-3 bg-white border border-[rgba(21,36,71,0.08)] rounded-[10px] p-[14px_16px] shadow-sm">
                  <span className="w-[7px] h-[7px] rounded-full bg-[#C9A227] mt-[6px] shrink-0" />
                  <p className="text-[13.5px] text-[#3A3835] leading-[1.5]">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="bg-[#152447] rounded-[14px] p-[32px_26px] text-center shadow-lg">
            <h2 className="font-[Space_Grotesk] font-semibold text-[19px] text-white mb-2">{book.ctaTitle}</h2>
            <p className="text-[13.5px] text-[#C7CCDA] mb-5 leading-[1.5]">{book.ctaSubtitle}</p>
            <button
              onClick={() => { setSent(false); setResult(null); setOpen(true); }}
              className="inline-flex items-center gap-2 bg-[#C9A227] text-[#0D1830] font-bold text-[14px] px-[30px] py-[14px] rounded-full border-none cursor-pointer hover:bg-[#E4C766] transition-colors shadow-md"
            >
              {isFree ? 'Download Free →' : `Get the Book — ${book.payment?.currency || '₦'}${book.payment?.price?.toLocaleString() || ''} →`}
            </button>
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center pb-8 pt-4 border-t border-[rgba(21,36,71,0.08)] px-6">
        <div className="font-[Space_Grotesk] font-semibold text-[14px]">{book.author}</div>
        <div className="font-[JetBrains_Mono] text-[10px] tracking-[0.6px] text-[#6B6860] uppercase mt-[3px]">{book.authorRole}</div>
      </footer>

      {/* Lead / Purchase Form Popup */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6 py-8 overflow-y-auto" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative my-auto" onClick={e => e.stopPropagation()}>
            {sent && result ? (
              <div className="text-center py-2">
                <div className="text-4xl mb-2">{isFree ? '🎉' : '💳'}</div>
                <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#152447] mb-2">
                  {isFree ? `Thank You, ${result.name}!` : `Almost There, ${result.name}!`}
                </h3>

                {isFree ? (
                  <>
                    <p className="text-sm text-[#3A3835] mb-4 leading-relaxed">
                      {book.donation?.thankYouMessage || `Thank you for downloading "${book.title}"!`}
                    </p>

                    {book.donation && (
                      <div className="bg-gradient-to-br from-[#152447] to-[#0D1830] rounded-xl p-5 text-left mb-4">
                        <p className="text-[#C9A227] font-[JetBrains_Mono] text-[10px] uppercase tracking-wider mb-2">❤️ Support Our Work</p>
                        <p className="text-[#C7CCDA] text-xs leading-relaxed mb-3">{book.donation.donationMessage}</p>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5">
                          <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase">Account Name</span><span className="text-sm text-white font-semibold">{book.donation.accountName}</span></div>
                          <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase">Account No.</span><span className="text-sm text-[#C9A227] font-mono font-bold tracking-wider">{book.donation.accountNumber}</span></div>
                          <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase">Bank</span><span className="text-sm text-white font-semibold">{book.donation.bankName}</span></div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">Any amount is deeply appreciated 🙏</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => downloadGuidePdf(result.name, book)}
                        className="w-full bg-[#C9A227] text-[#0D1830] font-bold text-sm py-3 rounded-full hover:bg-[#E4C766] transition"
                      >
                        ⬇ Download Again
                      </button>
                      <a
                        href={`https://wa.me/${book.adminWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi, I just downloaded "${book.title}". Thank you!`)}`}
                        target="_blank" rel="noreferrer"
                        className="w-full bg-[#25D366] text-white font-bold text-sm py-3 rounded-full hover:bg-[#1eb857] transition no-underline"
                      >
                        💬 Chat with Us
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[#3A3835] mb-4 leading-relaxed">
                      Your purchase request has been sent. To complete your order, make your payment and send us your proof.
                    </p>
                    {book.payment && (
                      <div className="bg-gradient-to-br from-[#152447] to-[#0D1830] rounded-xl p-5 text-left mb-4">
                        <p className="text-[#C9A227] font-[JetBrains_Mono] text-[10px] uppercase tracking-wider mb-2">💳 Payment Details</p>
                        <p className="text-[#C7CCDA] text-xs mb-3">{book.payment.paymentNote}</p>
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5">
                          <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase">Account Name</span><span className="text-sm text-white font-semibold">{book.payment.accountName}</span></div>
                          <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase">Account No.</span><span className="text-sm text-[#C9A227] font-mono font-bold tracking-wider">{book.payment.accountNumber}</span></div>
                          <div className="flex justify-between"><span className="text-[10px] text-slate-400 uppercase">Bank</span><span className="text-sm text-white font-semibold">{book.payment.bankName}</span></div>
                          <div className="flex justify-between border-t border-white/10 pt-2 mt-2"><span className="text-[10px] text-slate-400 uppercase">Amount</span><span className="text-base text-amber-400 font-bold">{book.payment.currency || '₦'}{book.payment.price?.toLocaleString()}</span></div>
                        </div>
                      </div>
                    )}
                    <a
                      href={`https://wa.me/${book.adminWhatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi! I just paid for "${book.title}". Name: ${result.name}, Email: ${result.email}. Please send me the book.`)}`}
                      target="_blank" rel="noreferrer"
                      className="w-full bg-[#25D366] text-white font-bold text-sm py-3 rounded-full hover:bg-[#1eb857] transition no-underline flex items-center justify-center"
                    >
                      📲 Send Payment Proof on WhatsApp
                    </a>
                  </>
                )}

                <button onClick={() => { setOpen(false); setSent(false); setResult(null); }} className="mt-4 text-xs text-[#6B6860] underline">Back to Page</button>
              </div>
            ) : (
              <>
                <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#152447] mb-1">
                  {isFree ? 'Get the Book Free' : `Get "${book.title}"`}
                </h3>
                <p className="text-xs text-[#6B6860] mb-4">
                  {isFree ? 'Fill in your details — delivered instantly.' : `Fill in your details to proceed with your ${book.payment?.currency || '₦'}${book.payment?.price?.toLocaleString()} purchase.`}
                </p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-[#152447] mb-1 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <input type="text" placeholder="e.g. Tunde Alao" value={name} onChange={e => setName(e.target.value)} className={inputClass(fieldStatus.name)} />
                      {isValidName(name) && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>}
                    </div>
                    {fieldStatus.name && <p className="text-[10px] text-red-500 mt-1">Enter at least 2 characters.</p>}
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-[#152447] mb-1 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <input type="email" placeholder="e.g. tunde@company.ng" value={email} onChange={e => setEmail(e.target.value)} className={inputClass(fieldStatus.email)} />
                      {isValidEmail(email) && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>}
                    </div>
                    {fieldStatus.email && <p className="text-[10px] text-red-500 mt-1">Enter a valid email address.</p>}
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-[#152447] mb-1 uppercase tracking-wider">Phone / WhatsApp</label>
                    <div className="relative">
                      <input type="tel" placeholder="+2349030192034 or 08123456789" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass(fieldStatus.phone)} />
                      {isValidPhone(phone) && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">✓</span>}
                    </div>
                    {fieldStatus.phone && <p className="text-[10px] text-red-500 mt-1">Enter a complete phone number.</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={!formComplete || submitting}
                    className={`mt-2 font-bold text-sm py-3.5 rounded-full transition-colors shadow-md ${
                      formComplete ? 'bg-[#C9A227] text-[#0D1830] hover:bg-[#E4C766] cursor-pointer animate-pulse' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? 'Processing…' : (isFree ? 'Get Instant Access →' : `Pay ${book.payment?.currency || '₦'}${book.payment?.price?.toLocaleString()} →`)}
                  </button>
                  {!formComplete && <p className="text-[10px] text-[#6B6860] text-center -mt-1">🔒 Complete all fields to unlock</p>}
                </form>
              </>
            )}
            <button onClick={() => { setOpen(false); setSent(false); setResult(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
          </div>
        </div>
      )}

      {/* Book-Level Admin Passcode Modal */}
      {passcodeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6" onClick={() => setPasscodeOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-8 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Space_Grotesk] text-lg font-bold text-amber-400 mb-1">🔐 Book Admin Access</h3>
            <p className="text-xs text-slate-400 mb-4">Enter the passcode for "{book.title}"</p>
            <form onSubmit={handleAdminCheck} className="flex flex-col gap-3">
              <input required type="password" placeholder="Enter book passcode" value={adminCode} onChange={e => setAdminCode(e.target.value)} className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-center tracking-widest font-mono" autoFocus />
              {adminErr && <p className="text-xs text-red-400 text-center">{adminErr}</p>}
              <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm py-3 rounded-full transition">Unlock Dashboard</button>
            </form>
            <button onClick={() => setPasscodeOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

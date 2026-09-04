import { useState } from 'react';
import type { Book } from '../types';
import { generateId, slugify, saveBooks, loadLeads } from '../storage';

interface Props {
  books: Book[];
  onBooksChange: (books: Book[]) => void;
  onEditBook: (book: Book) => void;
  onViewLanding: (book: Book) => void;
}

const EMPTY_FREE_BOOK = (): Partial<Book> => ({
  type: 'free',
  title: '',
  subtitle: '',
  author: 'Olakunle Samuel',
  authorRole: 'Nexa Growth Studio — Ibadan, Nigeria',
  kicker: 'Free Guide · No Strings Attached',
  whatsInside: ['First key insight of this book.', 'Second key insight.', 'Third key insight.'],
  ctaTitle: 'Get your free copy',
  ctaSubtitle: 'Enter your details. The guide is delivered to you immediately.',
  adminWhatsapp: '+2349030192034',
  adminPasscode: 'admin123',
  published: false,
  donation: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    thankYouMessage: 'Thank you so much for reading! If this guide helped you, please consider supporting our work.',
    donationMessage: 'Support us — donate any amount you wish.',
  },
});

const EMPTY_PAID_BOOK = (): Partial<Book> => ({
  type: 'paid',
  title: '',
  subtitle: '',
  author: 'Olakunle Samuel',
  authorRole: 'Nexa Growth Studio — Ibadan, Nigeria',
  kicker: 'Premium Book',
  whatsInside: ['First key insight of this book.', 'Second key insight.', 'Third key insight.'],
  ctaTitle: 'Get the Book',
  ctaSubtitle: 'Secure your copy today and start transforming your business.',
  adminWhatsapp: '+2349030192034',
  adminPasscode: 'admin123',
  published: false,
  payment: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    price: 5000,
    currency: '₦',
    paymentNote: 'Transfer the exact amount and send us your receipt on WhatsApp to receive the book.',
  },
});

export default function MegaAdmin({ books, onBooksChange, onEditBook, onViewLanding }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [bookType, setBookType] = useState<'free' | 'paid'>('free');
  const [draft, setDraft] = useState<Partial<Book>>(EMPTY_FREE_BOOK());
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const allLeads = loadLeads();

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTypeChange = (t: 'free' | 'paid') => {
    setBookType(t);
    setDraft(t === 'free' ? EMPTY_FREE_BOOK() : EMPTY_PAID_BOOK());
  };

  const handleCreate = () => {
    if (!draft.title?.trim()) return alert('Please enter a book title.');
    if (!draft.adminWhatsapp?.trim()) return alert('Please enter the admin WhatsApp number.');
    if (!draft.adminPasscode?.trim()) return alert('Please enter an admin passcode for this book.');

    setCreating(true);
    const id = generateId();
    const slug = slugify(draft.title);
    const newBook: Book = {
      id,
      slug,
      title: draft.title!,
      subtitle: draft.subtitle || '',
      author: draft.author || 'Olakunle Samuel',
      authorRole: draft.authorRole || 'Nexa Growth Studio — Ibadan, Nigeria',
      kicker: draft.kicker || (bookType === 'free' ? 'Free Guide · No Strings Attached' : 'Premium Book'),
      type: bookType,
      whatsInside: draft.whatsInside || [],
      ctaTitle: draft.ctaTitle || 'Get your copy',
      ctaSubtitle: draft.ctaSubtitle || '',
      adminWhatsapp: draft.adminWhatsapp!,
      adminPasscode: draft.adminPasscode!,
      published: true,
      createdAt: new Date().toISOString(),
      ...(bookType === 'free' ? { donation: draft.donation } : { payment: draft.payment, price: draft.payment?.price, currency: draft.payment?.currency }),
    };

    const updated = [newBook, ...books];
    onBooksChange(updated);
    saveBooks(updated);
    setCreateOpen(false);
    setDraft(EMPTY_FREE_BOOK());
    setCreating(false);
  };

  const handleDelete = (id: string) => {
    const updated = books.filter(b => b.id !== id);
    onBooksChange(updated);
    saveBooks(updated);
    setDeleteConfirm(null);
  };

  const handleTogglePublish = (id: string) => {
    const updated = books.map(b => b.id === id ? { ...b, published: !b.published } : b);
    onBooksChange(updated);
    saveBooks(updated);
  };

  const totalLeads = allLeads.length;
  const totalPaid = allLeads.filter(l => l.paid).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-5 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg">N</div>
            <div>
              <h1 className="font-[Space_Grotesk] font-bold text-xl tracking-tight">Nexa Publishing HQ</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Mega Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => { setDraft(bookType === 'free' ? EMPTY_FREE_BOOK() : EMPTY_PAID_BOOK()); setCreateOpen(true); }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-md"
          >
            + New Book
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Total Books</span>
            <span className="text-2xl font-bold text-white">{books.length}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Published</span>
            <span className="text-2xl font-bold text-emerald-400">{books.filter(b => b.published).length}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Total Leads</span>
            <span className="text-2xl font-bold text-amber-400">{totalLeads}</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block">Paid Sales</span>
            <span className="text-2xl font-bold text-blue-400">{totalPaid}</span>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search books…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-white w-full max-w-xs"
          />
          <span className="text-xs text-slate-400">{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
            <span className="text-4xl mb-3">📚</span>
            <h3 className="font-[Space_Grotesk] font-bold text-lg mb-1">No books yet</h3>
            <p className="text-sm text-slate-400 mb-5 max-w-sm">Create your first book to generate a landing page and start collecting leads.</p>
            <button onClick={() => setCreateOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition">+ Create First Book</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredBooks.map(book => {
              const bookLeads = allLeads.filter(l => l.bookId === book.id);
              const bookPaid = bookLeads.filter(l => l.paid).length;
              const shareUrl = `${window.location.origin}${window.location.pathname}#/book/${book.slug}`;

              return (
                <div key={book.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-slate-700 transition">
                  {/* Book header */}
                  <div className={`px-5 pt-5 pb-4 ${book.type === 'free' ? 'bg-gradient-to-br from-[#152447] to-[#0D1830]' : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${book.type === 'free' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                        {book.type === 'free' ? 'Free' : `${book.payment?.currency || '₦'}${book.payment?.price?.toLocaleString()}`}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${book.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                        {book.published ? '● Live' : '○ Draft'}
                      </span>
                    </div>
                    <h3 className="font-[Space_Grotesk] font-bold text-white text-base leading-tight mb-1">{book.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{book.subtitle}</p>
                  </div>

                  {/* Stats */}
                  <div className="px-5 py-3 border-b border-slate-800 flex gap-4">
                    <div><span className="text-xs text-slate-400 block">Leads</span><span className="text-sm font-bold text-white">{bookLeads.length}</span></div>
                    {book.type === 'paid' && <div><span className="text-xs text-slate-400 block">Paid</span><span className="text-sm font-bold text-emerald-400">{bookPaid}</span></div>}
                    <div><span className="text-xs text-slate-400 block">Slug</span><span className="text-xs font-mono text-slate-500">/{book.slug}</span></div>
                  </div>

                  {/* Share URL */}
                  <div className="px-5 py-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] text-amber-400 bg-black/30 px-2 py-1 rounded flex-1 truncate">{shareUrl}</code>
                      <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition">Copy</button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-4 flex flex-wrap gap-2 mt-auto">
                    <button onClick={() => onEditBook(book)} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-lg transition">Manage</button>
                    <button onClick={() => onViewLanding(book)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2 rounded-lg border border-slate-700 transition">Preview</button>
                    <button onClick={() => handleTogglePublish(book.id)} className={`flex-1 text-xs py-2 rounded-lg border transition ${book.published ? 'bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50' : 'bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50'}`}>
                      {book.published ? 'Unpublish' : 'Publish'}
                    </button>
                    {deleteConfirm === book.id ? (
                      <>
                        <button onClick={() => handleDelete(book.id)} className="text-xs py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition">Confirm Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs py-2 px-3 bg-slate-700 text-white rounded-lg transition">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(book.id)} className="text-xs py-2 px-3 text-red-400 hover:bg-red-900/20 rounded-lg border border-red-900/40 transition">🗑</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Book Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6 py-8 overflow-y-auto" onClick={() => setCreateOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl w-full shadow-2xl relative my-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Space_Grotesk] text-xl font-bold text-amber-400 mb-1">Create New Book</h3>
            <p className="text-xs text-slate-400 mb-5">Set up your book's landing page. You can edit everything later.</p>

            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button onClick={() => handleTypeChange('free')} className={`py-3 rounded-xl text-sm font-bold border transition ${bookType === 'free' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>🆓 Free Book</button>
              <button onClick={() => handleTypeChange('paid')} className={`py-3 rounded-xl text-sm font-bold border transition ${bookType === 'paid' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>💰 Paid Book</button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Book Title *</label>
                <input type="text" value={draft.title || ''} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. The Small Business Sales Playbook"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Subtitle</label>
                <textarea value={draft.subtitle || ''} onChange={e => setDraft(p => ({ ...p, subtitle: e.target.value }))}
                  placeholder="A short description of the book…"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Author Name</label>
                  <input type="text" value={draft.author || ''} onChange={e => setDraft(p => ({ ...p, author: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Admin WhatsApp *</label>
                  <input type="text" value={draft.adminWhatsapp || ''} onChange={e => setDraft(p => ({ ...p, adminWhatsapp: e.target.value }))}
                    placeholder="+2349030192034"
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Book Admin Passcode *</label>
                  <input type="text" value={draft.adminPasscode || ''} onChange={e => setDraft(p => ({ ...p, adminPasscode: e.target.value }))}
                    placeholder="Set a unique passcode"
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono" />
                </div>
                {bookType === 'paid' && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Price (₦)</label>
                    <input type="number" value={draft.payment?.price || ''} onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, price: Number(e.target.value) } }))}
                      placeholder="e.g. 5000"
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  </div>
                )}
              </div>

              {bookType === 'paid' && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <label className="text-[10px] uppercase tracking-wider text-amber-400 block mb-3">💳 Payment Account</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Account Name</label>
                      <input type="text" value={draft.payment?.accountName || ''} onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, accountName: e.target.value } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Account Number</label>
                      <input type="text" value={draft.payment?.accountNumber || ''} onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, accountNumber: e.target.value } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-1">Bank Name</label>
                      <input type="text" value={draft.payment?.bankName || ''} onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, bankName: e.target.value } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleCreate} disabled={creating || !draft.title?.trim()} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm py-3.5 rounded-xl transition shadow-md mt-2">
                {creating ? 'Creating…' : '🚀 Create Landing Page'}
              </button>
            </div>

            <button onClick={() => setCreateOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { Book } from '../types';
import { MEGA_ADMIN_PASSCODE_KEY } from '../types';
import { generateId, slugify, saveBooks, loadLeads } from '../storage';
import {
  getEffectiveDbUrl,
  testConnection, pullFromCloud, pushToCloudUrl, readLocal, writeLocal, getLastSync,
} from '../cloud';

interface Props {
  books: Book[];
  onBooksChange: (books: Book[]) => void;
  onEditBook: (book: Book) => void;
  onViewLanding: (book: Book) => void;
  megaPasscode: string;
  onMegaPasscodeChanged: (next: string) => void;
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

export default function MegaAdmin({ books, onBooksChange, onEditBook, onViewLanding, megaPasscode, onMegaPasscodeChanged }: Props) {
  const [mainTab, setMainTab] = useState<'books' | 'settings'>('books');
  const [createOpen, setCreateOpen] = useState(false);
  const [bookType, setBookType] = useState<'free' | 'paid'>('free');
  const [draft, setDraft] = useState<Partial<Book>>(EMPTY_FREE_BOOK());
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Settings state ──
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [bookAccess, setBookAccess] = useState<Record<string, { passcode: string; whatsapp: string }>>({});
  const [accessMsg, setAccessMsg] = useState<string | null>(null);

  const dbUrl = getEffectiveDbUrl();
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncBusy, setSyncBusy] = useState<'idle' | 'testing' | 'pushing' | 'pulling'>('idle');
  const [lastSync, setLastSync] = useState<string | null>(getLastSync());
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

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

  /* ── Password settings ── */
  const handleMegaPassChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (curPass !== megaPasscode) { setPassMsg({ ok: false, text: 'Current passcode is incorrect.' }); return; }
    if (newPass.length < 6) { setPassMsg({ ok: false, text: 'New passcode must be at least 6 characters.' }); return; }
    if (newPass !== confirmPass) { setPassMsg({ ok: false, text: 'New passcodes do not match.' }); return; }
    try { localStorage.setItem(MEGA_ADMIN_PASSCODE_KEY, newPass); } catch { /* */ }
    onMegaPasscodeChanged(newPass);
    setCurPass(''); setNewPass(''); setConfirmPass('');
    setPassMsg({ ok: true, text: 'Mega admin passcode updated. Use the new code next time you log in.' });
  };

  const getAccessVal = (book: Book, field: 'passcode' | 'whatsapp') => {
    const ov = bookAccess[book.id];
    if (ov) return ov[field];
    return field === 'passcode' ? book.adminPasscode : book.adminWhatsapp;
  };

  const handleSaveBookAccess = (bookId: string) => {
    const ov = bookAccess[bookId];
    if (!ov) return;
    if (!ov.passcode.trim()) { setAccessMsg('Passcode cannot be empty.'); return; }
    const updated = books.map(b => b.id === bookId ? { ...b, adminPasscode: ov.passcode.trim(), adminWhatsapp: ov.whatsapp.trim() || b.adminWhatsapp } : b);
    onBooksChange(updated);
    saveBooks(updated);
    setAccessMsg(`Access updated for "${books.find(b => b.id === bookId)?.title}".`);
    setTimeout(() => setAccessMsg(null), 3000);
  };

  /* ── Cloud sync settings ── */
  const handleTest = async () => {
    setSyncBusy('testing'); setSyncMsg(null);
    const r = await testConnection(dbUrl);
    setSyncMsg({ ok: r.ok, text: r.message });
    setSyncBusy('idle');
  };

  const handlePush = async () => {
    if (!dbUrl.trim()) { setSyncMsg({ ok: false, text: 'Enter your database URL first.' }); return; }
    setSyncBusy('pushing'); setSyncMsg(null);
    try {
      const { books: lb, leads: ll } = readLocal();
      await pushToCloudUrl(dbUrl, lb, ll);
      setLastSync(new Date().toISOString());
      setSyncMsg({ ok: true, text: `Uploaded ${lb.length} book(s) and ${ll.length} lead(s) to the cloud. Other browsers will pull this on next load.` });
    } catch (e) {
      setSyncMsg({ ok: false, text: `Upload failed: ${e instanceof Error ? e.message : String(e)}` });
    }
    setSyncBusy('idle');
  };

  const handlePull = async () => {
    if (!dbUrl.trim()) { setSyncMsg({ ok: false, text: 'Enter your database URL first.' }); return; }
    if (!confirm('Download cloud data and replace what is on THIS browser?')) return;
    setSyncBusy('pulling'); setSyncMsg(null);
    try {
      const cloud = await pullFromCloud(dbUrl);
      if (!cloud || (cloud.books.length === 0 && cloud.leads.length === 0)) {
        setSyncMsg({ ok: false, text: 'Cloud database is empty — nothing to download. Push first.' });
      } else {
        writeLocal(cloud.books, cloud.leads);
        onBooksChange(cloud.books);
        setLastSync(new Date().toISOString());
        setSyncMsg({ ok: true, text: `Downloaded ${cloud.books.length} book(s) and ${cloud.leads.length} lead(s). Page will reflect cloud data.` });
      }
    } catch (e) {
      setSyncMsg({ ok: false, text: `Download failed: ${e instanceof Error ? e.message : String(e)}` });
    }
    setSyncBusy('idle');
  };

  /* ── Backup ── */
  const handleExport = () => {
    const { books: lb, leads: ll } = readLocal();
    const blob = new Blob([JSON.stringify({ app: 'nexa-publishing', exportedAt: new Date().toISOString(), books: lb, leads: ll }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMsg('Backup downloaded. Keep this file safe.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result as string);
        if (!Array.isArray(data.books)) throw new Error('Invalid backup file.');
        if (!confirm(`Restore backup with ${data.books.length} book(s) and ${(data.leads || []).length} lead(s)? This replaces current data on THIS browser.`)) return;
        writeLocal(data.books, Array.isArray(data.leads) ? data.leads : []);
        onBooksChange(data.books);
        setBackupMsg('Backup restored successfully.');
      } catch {
        setBackupMsg('Could not read backup file. Make sure it is a Nexa backup JSON.');
      }
    };
    r.readAsText(file);
    e.target.value = '';
  };

  const totalLeads = allLeads.length;
  const totalPaid = allLeads.filter(l => l.paid).length;

  const inputCls = 'w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 text-white';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-5 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-lg">N</div>
            <div>
              <h1 className="font-[Space_Grotesk] font-bold text-xl tracking-tight">Nexa Publishing HQ</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Mega Admin Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button onClick={() => setMainTab('books')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${mainTab === 'books' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'}`}>📚 Books</button>
              <button onClick={() => setMainTab('settings')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${mainTab === 'settings' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'}`}>⚙️ Settings</button>
            </div>
            {mainTab === 'books' && (
              <button
                onClick={() => { setDraft(bookType === 'free' ? EMPTY_FREE_BOOK() : EMPTY_PAID_BOOK()); setCreateOpen(true); }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-md"
              >
                + New Book
              </button>
            )}
          </div>
        </div>
      </header>

      {mainTab === 'books' ? (
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

          {/* Search */}
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

                    <div className="px-5 py-3 border-b border-slate-800 flex gap-4">
                      <div><span className="text-xs text-slate-400 block">Leads</span><span className="text-sm font-bold text-white">{bookLeads.length}</span></div>
                      {book.type === 'paid' && <div><span className="text-xs text-slate-400 block">Paid</span><span className="text-sm font-bold text-emerald-400">{bookPaid}</span></div>}
                      <div><span className="text-xs text-slate-400 block">Slug</span><span className="text-xs font-mono text-slate-500">/{book.slug}</span></div>
                    </div>

                    <div className="px-5 py-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] text-amber-400 bg-black/30 px-2 py-1 rounded flex-1 truncate">{shareUrl}</code>
                        <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition">Copy</button>
                      </div>
                    </div>

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
      ) : (
        /* ─────────────── SETTINGS TAB ─────────────── */
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* 1 — Mega admin password */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-amber-400 mb-1">🔐 Mega Admin Password</h2>
            <p className="text-xs text-slate-400 mb-4">This code unlocks <code className="text-slate-200">#/admin</code> (all books). Keep it private.</p>
            <form onSubmit={handleMegaPassChange} className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Current</label>
                <input type={showPass ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} className={inputCls} placeholder="••••••" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">New (min 6)</label>
                <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} className={inputCls} placeholder="New code" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Confirm new</label>
                <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className={inputCls} placeholder="Repeat" />
              </div>
              <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition">Update Mega Password</button>
                <button type="button" onClick={() => setShowPass(s => !s)} className="text-xs text-slate-400 hover:text-slate-200">{showPass ? 'Hide' : 'Show'} codes</button>
                {passMsg && <span className={`text-xs ${passMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{passMsg.text}</span>}
              </div>
            </form>
          </section>

          {/* 2 — Per-book access */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-amber-400 mb-1">📖 Book Access Codes</h2>
            <p className="text-xs text-slate-400 mb-4">Each book has its own admin code + WhatsApp. Share a book's code with a co-admin without exposing HQ.</p>
            {books.length === 0 && <p className="text-xs text-slate-500">No books yet.</p>}
            <div className="space-y-3">
              {books.map(b => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-3 truncate">{b.title} <span className="text-[10px] font-mono text-slate-500">#/admin/book/{b.slug}</span></p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Book passcode</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={getAccessVal(b, 'passcode')}
                        onChange={e => setBookAccess(p => ({ ...p, [b.id]: { passcode: e.target.value, whatsapp: getAccessVal(b, 'whatsapp') } }))}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Admin WhatsApp</label>
                      <input
                        type="text"
                        value={getAccessVal(b, 'whatsapp')}
                        onChange={e => setBookAccess(p => ({ ...p, [b.id]: { passcode: getAccessVal(b, 'passcode'), whatsapp: e.target.value } }))}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                  </div>
                  <button onClick={() => handleSaveBookAccess(b.id)} className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition">Save access for this book</button>
                </div>
              ))}
            </div>
            {accessMsg && <p className="text-xs text-emerald-400 mt-3">{accessMsg}</p>}
          </section>

          {/* 3 — Auto cross-browser sync */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-amber-400 mb-1">☁️ Auto Cross-Browser Sync</h2>
            <p className="text-xs text-slate-400 mb-4">
              <b className="text-emerald-400">● Automatic</b> — no buttons needed. Every edit, lead, cover or PDF syncs to Firebase and appears on every open browser &amp; phone instantly.
              {lastSync && <span className="block mt-1">Last sync: {new Date(lastSync).toLocaleString()}</span>}
            </p>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Firebase Realtime Database URL</label>
            <input
              type="text" value={dbUrl} readOnly
              className={`${inputCls} font-mono mb-3 opacity-70 cursor-not-allowed`}
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={handleTest} disabled={syncBusy !== 'idle'} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
                {syncBusy === 'testing' ? 'Testing…' : 'Test Connection'}
              </button>
              <button onClick={handlePush} disabled={syncBusy !== 'idle'} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
                {syncBusy === 'pushing' ? 'Uploading…' : 'Sync Now (one-time migration)'}
              </button>
              <button onClick={handlePull} disabled={syncBusy !== 'idle'} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50">
                {syncBusy === 'pulling' ? 'Downloading…' : 'Load Latest (one-time)'}
              </button>
            </div>
            {syncMsg && <p className={`text-xs mt-3 ${syncMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{syncMsg.text}</p>}
            <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 leading-relaxed">
              <b className="text-slate-200">How it works:</b> this site opens a real-time connection to Firebase. When you add, edit or delete anything, it uploads automatically. Every other browser with the site open receives the change within a second — no refresh needed. The buttons above are only useful for a one-time migration of old browser data.
            </div>
          </section>

          {/* 4 — Backup */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-amber-400 mb-1">💾 Backup &amp; Restore</h2>
            <p className="text-xs text-slate-400 mb-4">Download a full backup before major changes. Restore it on any device to copy everything over manually.</p>
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={handleExport} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition">⬇ Download Backup (JSON)</button>
              <label className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition cursor-pointer">
                ⬆ Restore from File
                <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
              </label>
              {backupMsg && <span className="text-xs text-slate-300">{backupMsg}</span>}
            </div>
          </section>
        </div>
      )}

      {/* Create Book Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6 py-8 overflow-y-auto" onClick={() => setCreateOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl w-full shadow-2xl relative my-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Space_Grotesk] text-xl font-bold text-amber-400 mb-1">Create New Book</h3>
            <p className="text-xs text-slate-400 mb-5">Set up your book's landing page. You can edit everything later.</p>

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

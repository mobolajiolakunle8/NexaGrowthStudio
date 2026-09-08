import { useEffect, useState } from 'react';
import type { Book, SiteSettings } from '../types';
import { MEGA_ADMIN_PASSCODE_KEY } from '../types';
import { generateId, slugify, saveBooks, loadLeads } from '../storage';
import {
  getEffectiveDbUrl,
  testConnection, pullFromCloud, pushToCloudUrl, readLocal, writeLocal, getLastSync
} from '../cloud';

interface Props {
  books: Book[];
  settings: SiteSettings;
  onBooksChange: (books: Book[]) => void;
  onSettingsChange: (settings: SiteSettings) => Promise<void>;
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
  authorRole: 'Founder & Publisher',
  kicker: 'Free Business Book',
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
    donationMessage: 'Support our mission — donate any amount you wish.',
  },
});

const EMPTY_PAID_BOOK = (): Partial<Book> => ({
  type: 'paid',
  title: '',
  subtitle: '',
  author: 'Olakunle Samuel',
  authorRole: 'Founder & Publisher',
  kicker: 'Executive Edition',
  whatsInside: ['First key insight of this book.', 'Second key insight.', 'Third key insight.'],
  ctaTitle: 'Secure your copy',
  ctaSubtitle: 'Complete payment and receive the permanent book link automatically on WhatsApp.',
  adminWhatsapp: '+2349030192034',
  adminPasscode: 'admin123',
  published: false,
  payment: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    price: 5000,
    currency: '₦',
    paymentNote: 'Transfer the exact amount and send your receipt on WhatsApp to verify your order.',
  },
});

export default function MegaAdmin({
  books,
  settings,
  onBooksChange,
  onSettingsChange,
  onEditBook,
  onViewLanding,
  megaPasscode,
  onMegaPasscodeChanged,
}: Props) {
  const [mainTab, setMainTab] = useState<'books' | 'frontpage' | 'settings'>('books');
  const [createOpen, setCreateOpen] = useState(false);
  const [bookType, setBookType] = useState<'free' | 'paid'>('free');
  const [draft, setDraft] = useState<Partial<Book>>(EMPTY_FREE_BOOK());
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Frontpage Editor State
  const [siteDraft, setSiteDraft] = useState<SiteSettings>(settings);
  const [savingFrontpage, setSavingFrontpage] = useState(false);
  const [frontpageMsg, setFrontpageMsg] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    setSiteDraft(settings);
  }, [settings]);

  // Settings State
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
      author: draft.author || settings.founderName,
      authorRole: draft.authorRole || settings.founderRole,
      kicker: draft.kicker || (bookType === 'free' ? 'Free Business Book' : 'Executive Edition'),
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

  /* ── Save Frontpage Edits ── */
  const handleSaveFrontpage = async () => {
    setSavingFrontpage(true);
    setFrontpageMsg(null);
    try {
      await onSettingsChange(siteDraft);
      setFrontpageMsg('✓ Front page updated and broadcast to all live browsers!');
      setTimeout(() => setFrontpageMsg(null), 4000);
    } catch (e) {
      setFrontpageMsg(`Failed to save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingFrontpage(false);
    }
  };

  const handleFounderPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFrontpageMsg('Please choose an image file (JPG, PNG, or WebP).');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFrontpageMsg('Please choose a founder photo smaller than 8MB.');
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    setFrontpageMsg('Optimizing founder photo…');
    try {
      const { approxDataUrlKB, compressImageFile } = await import('../storage');
      // Re-encode until the portrait is small enough to travel safely in the
      // Realtime Database settings record. This avoids Firebase Storage stalls.
      const profiles: Array<[number, number]> = [
        [900, 0.82],
        [720, 0.75],
        [560, 0.68],
        [460, 0.6],
      ];
      let portrait = '';
      let sizeKB = 0;

      for (const [dimension, quality] of profiles) {
        const candidate = await compressImageFile(file, dimension, quality);
        const candidateSize = approxDataUrlKB(candidate);
        portrait = candidate;
        sizeKB = candidateSize;
        if (candidateSize <= 280) break;
      }

      if (sizeKB > 320) {
        setFrontpageMsg('Photo is still too large after optimization. Please use a smaller JPG or PNG under 3MB.');
        return;
      }

      const updated = { ...siteDraft, founderPhoto: portrait };
      setSiteDraft(updated);

      // Upload directly to the same live settings record used by the front
      // page. No Firebase Storage setup or stalled upload state is involved.
      await onSettingsChange(updated);
      setFrontpageMsg(`✓ Founder portrait published (${sizeKB}KB) and synced to every browser.`);
    } catch (error) {
      setFrontpageMsg(`Photo upload failed: ${error instanceof Error ? error.message : 'Please try a JPG or PNG.'}`);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
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
    setPassMsg({ ok: true, text: 'Mega admin passcode updated successfully.' });
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

  /* ── Cloud sync ── */
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
      setSyncMsg({ ok: true, text: `Uploaded ${lb.length} book(s) and ${ll.length} lead(s) to cloud.` });
    } catch (e) {
      setSyncMsg({ ok: false, text: `Upload failed: ${e instanceof Error ? e.message : String(e)}` });
    }
    setSyncBusy('idle');
  };

  const handlePull = async () => {
    if (!dbUrl.trim()) { setSyncMsg({ ok: false, text: 'Enter your database URL first.' }); return; }
    if (!confirm('Download cloud data and replace this browser’s cache?')) return;
    setSyncBusy('pulling'); setSyncMsg(null);
    try {
      const cloud = await pullFromCloud(dbUrl);
      if (!cloud || (cloud.books.length === 0 && cloud.leads.length === 0)) {
        setSyncMsg({ ok: false, text: 'Cloud database is empty.' });
      } else {
        writeLocal(cloud.books, cloud.leads);
        onBooksChange(cloud.books);
        setLastSync(new Date().toISOString());
        setSyncMsg({ ok: true, text: `Downloaded ${cloud.books.length} book(s) and ${cloud.leads.length} lead(s).` });
      }
    } catch (e) {
      setSyncMsg({ ok: false, text: `Download failed: ${e instanceof Error ? e.message : String(e)}` });
    }
    setSyncBusy('idle');
  };

  /* ── Backup ── */
  const handleExport = () => {
    const { books: lb, leads: ll } = readLocal();
    const blob = new Blob([JSON.stringify({ app: 'nexa-publishing', exportedAt: new Date().toISOString(), books: lb, leads: ll, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexa-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupMsg('Backup downloaded.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result as string);
        if (!Array.isArray(data.books)) throw new Error('Invalid backup file.');
        if (!confirm(`Restore backup with ${data.books.length} book(s)? This replaces current data on this device.`)) return;
        writeLocal(data.books, Array.isArray(data.leads) ? data.leads : []);
        onBooksChange(data.books);
        if (data.settings) {
          void onSettingsChange(data.settings);
          setSiteDraft(data.settings);
        }
        setBackupMsg('Backup restored successfully.');
      } catch {
        setBackupMsg('Could not read backup file.');
      }
    };
    r.readAsText(file);
    e.target.value = '';
  };

  const totalLeads = allLeads.length;
  const totalPaid = allLeads.filter(l => l.paid).length;

  const inputCls = 'w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white transition-colors';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-[Inter] selection:bg-[#C8862A] selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8862A] flex items-center justify-center text-slate-950 font-black text-lg font-[Space_Grotesk]">N</div>
            <div>
              <h1 className="font-[Space_Grotesk] font-bold text-lg tracking-tight">Nexa Publishing HQ</h1>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Executive Admin Console</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
              <button
                onClick={() => setMainTab('books')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mainTab === 'books' ? 'bg-[#C8862A] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                📚 Books ({books.length})
              </button>
              <button
                onClick={() => setMainTab('frontpage')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mainTab === 'frontpage' ? 'bg-[#C8862A] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏛️ Front Page
              </button>
              <button
                onClick={() => setMainTab('settings')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mainTab === 'settings' ? 'bg-[#C8862A] text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚙️ Settings & Passwords
              </button>
            </div>

            {mainTab === 'books' && (
              <button
                onClick={() => { setDraft(bookType === 'free' ? EMPTY_FREE_BOOK() : EMPTY_PAID_BOOK()); setCreateOpen(true); }}
                className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md"
              >
                + New Book
              </button>
            )}
          </div>
        </div>
      </header>

      {/* TAB 1: BOOKS */}
      {mainTab === 'books' && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 block font-mono uppercase">Total Books</span>
              <span className="text-2xl font-bold text-white font-[Space_Grotesk] mt-1 block">{books.length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 block font-mono uppercase">Published</span>
              <span className="text-2xl font-bold text-emerald-400 font-[Space_Grotesk] mt-1 block">{books.filter(b => b.published).length}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 block font-mono uppercase">Total Leads</span>
              <span className="text-2xl font-bold text-[#C8862A] font-[Space_Grotesk] mt-1 block">{totalLeads}</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-sm">
              <span className="text-xs text-slate-400 block font-mono uppercase">Paid Orders</span>
              <span className="text-2xl font-bold text-blue-400 font-[Space_Grotesk] mt-1 block">{totalPaid}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <input
              type="text"
              placeholder="Search library by title or author..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#C8862A] text-white w-full max-w-sm"
            />
            <span className="text-xs text-slate-400 font-mono">{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} found</span>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
              <span className="text-4xl mb-3">📚</span>
              <h3 className="font-[Space_Grotesk] font-bold text-lg mb-1">No books listed</h3>
              <p className="text-sm text-slate-400 mb-5 max-w-sm">Create a book to launch a landing page and start generating leads.</p>
              <button onClick={() => setCreateOpen(true)} className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition">+ Create First Book</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredBooks.map(book => {
                const bookLeads = allLeads.filter(l => l.bookId === book.id);
                const bookPaid = bookLeads.filter(l => l.paid).length;
                const shareUrl = `${window.location.origin}${window.location.pathname}#/book/${book.slug}`;

                return (
                  <div key={book.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-slate-700 transition-colors shadow-sm">
                    <div className="px-5 pt-5 pb-4 bg-gradient-to-br from-slate-900 to-slate-950 border-b border-slate-800/80">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          book.type === 'free' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#C8862A]/15 text-[#C8862A] border border-[#C8862A]/30'
                        }`}>
                          {book.type === 'free' ? 'Free Access' : `${book.payment?.currency || '₦'}${book.payment?.price?.toLocaleString()}`}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${book.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {book.published ? '● Live' : '○ Draft'}
                        </span>
                      </div>
                      <h3 className="font-[Space_Grotesk] font-bold text-white text-base leading-snug mb-1">{book.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{book.subtitle}</p>
                    </div>

                    <div className="px-5 py-3 border-b border-slate-800/60 flex gap-5 text-xs">
                      <div><span className="text-[10px] text-slate-400 block font-mono uppercase">Leads</span><span className="font-bold text-white">{bookLeads.length}</span></div>
                      {book.type === 'paid' && <div><span className="text-[10px] text-slate-400 block font-mono uppercase">Paid</span><span className="font-bold text-emerald-400">{bookPaid}</span></div>}
                      <div className="truncate"><span className="text-[10px] text-slate-400 block font-mono uppercase">Slug</span><span className="font-mono text-slate-400 text-[11px]">/{book.slug}</span></div>
                    </div>

                    <div className="px-5 py-3 border-b border-slate-800/60 bg-black/20">
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] text-[#C8862A] px-2 py-1 rounded flex-1 truncate font-mono">{shareUrl}</code>
                        <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Link copied to clipboard!'); }} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-md transition shrink-0 font-mono">Copy</button>
                      </div>
                    </div>

                    <div className="px-5 py-4 flex flex-wrap gap-2 mt-auto">
                      <button onClick={() => onEditBook(book)} className="flex-1 bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs py-2 rounded-xl transition">Manage Book</button>
                      <button onClick={() => onViewLanding(book)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2 rounded-xl border border-slate-700 transition">Preview</button>
                      <button onClick={() => handleTogglePublish(book.id)} className={`text-xs px-3 py-2 rounded-xl border transition ${book.published ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/20'}`}>
                        {book.published ? 'Unpublish' : 'Publish'}
                      </button>
                      {deleteConfirm === book.id ? (
                        <>
                          <button onClick={() => handleDelete(book.id)} className="text-xs py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition">Confirm</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs py-2 px-3 bg-slate-800 text-white rounded-xl">✕</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(book.id)} className="text-xs px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition">🗑</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FRONTPAGE CMS */}
      {mainTab === 'frontpage' && (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white">Front Page Content Management</h2>
              <p className="text-xs text-slate-400 mt-1">Live edits to the publishing house masthead, hero narrative, and founder profile.</p>
            </div>
            <button
              onClick={handleSaveFrontpage}
              disabled={savingFrontpage}
              className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition shadow-md self-start disabled:opacity-50"
            >
              {savingFrontpage ? 'Saving & Broadcasting...' : 'Save Front Page Changes'}
            </button>
          </div>

          {frontpageMsg && (
            <div className={`p-4 rounded-xl text-xs font-semibold ${
              frontpageMsg.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {frontpageMsg}
            </div>
          )}

          {/* Studio Brand Info */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">🏛️ Studio Identity</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Publishing House Name</label>
                <input
                  type="text"
                  value={siteDraft.studioName}
                  onChange={e => setSiteDraft(p => ({ ...p, studioName: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Location</label>
                <input
                  type="text"
                  value={siteDraft.location}
                  onChange={e => setSiteDraft(p => ({ ...p, location: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Studio Tagline (Header Sub-text)</label>
                <input
                  type="text"
                  value={siteDraft.studioTagline}
                  onChange={e => setSiteDraft(p => ({ ...p, studioTagline: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Navigation: Catalogue</label>
                <input
                  type="text"
                  value={siteDraft.navCatalogueLabel}
                  onChange={e => setSiteDraft(p => ({ ...p, navCatalogueLabel: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Navigation: Standard</label>
                <input
                  type="text"
                  value={siteDraft.navManifestoLabel}
                  onChange={e => setSiteDraft(p => ({ ...p, navManifestoLabel: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Navigation: Founder / Owner</label>
                <input
                  type="text"
                  value={siteDraft.navFounderLabel}
                  onChange={e => setSiteDraft(p => ({ ...p, navFounderLabel: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Hero Section */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">🌟 Homepage Hero Headline</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Hero Kicker (Small Top Label)</label>
                <input
                  type="text"
                  value={siteDraft.heroKicker}
                  onChange={e => setSiteDraft(p => ({ ...p, heroKicker: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Hero Proof Badge</label>
                <input
                  type="text"
                  value={siteDraft.heroBadgeText}
                  onChange={e => setSiteDraft(p => ({ ...p, heroBadgeText: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Field-tested business books"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Main Hero Headline</label>
                <input
                  type="text"
                  value={siteDraft.heroTitle}
                  onChange={e => setSiteDraft(p => ({ ...p, heroTitle: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Hero Sub-paragraph</label>
                <textarea
                  rows={3}
                  value={siteDraft.heroSubtitle}
                  onChange={e => setSiteDraft(p => ({ ...p, heroSubtitle: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Primary CTA Text</label>
                  <input
                    type="text"
                    value={siteDraft.heroPrimaryCta}
                    onChange={e => setSiteDraft(p => ({ ...p, heroPrimaryCta: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Secondary CTA Text</label>
                  <input
                    type="text"
                    value={siteDraft.heroSecondaryCta}
                    onChange={e => setSiteDraft(p => ({ ...p, heroSecondaryCta: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Publishing Standard */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">📚 Publishing Standard</h3>
              <p className="text-xs text-slate-400 mt-0.5">Edit the dark manifesto section shown above the catalogue.</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Section Eyebrow</label>
              <input
                type="text"
                value={siteDraft.manifestoEyebrow}
                onChange={e => setSiteDraft(p => ({ ...p, manifestoEyebrow: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Section Heading</label>
              <input
                type="text"
                value={siteDraft.manifestoHeading}
                onChange={e => setSiteDraft(p => ({ ...p, manifestoHeading: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="space-y-3">
              {siteDraft.manifestoCards.map((card, index) => (
                <div key={`${card.number}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#C8862A]">STANDARD {index + 1}</span>
                    {siteDraft.manifestoCards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSiteDraft(p => ({ ...p, manifestoCards: p.manifestoCards.filter((_, i) => i !== index) }))}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-[100px_1fr] gap-3">
                    <input
                      type="text"
                      value={card.number}
                      onChange={e => setSiteDraft(p => ({ ...p, manifestoCards: p.manifestoCards.map((item, i) => i === index ? { ...item, number: e.target.value } : item) }))}
                      className={inputCls}
                      placeholder="01"
                    />
                    <input
                      type="text"
                      value={card.title}
                      onChange={e => setSiteDraft(p => ({ ...p, manifestoCards: p.manifestoCards.map((item, i) => i === index ? { ...item, title: e.target.value } : item) }))}
                      className={inputCls}
                      placeholder="Standard title"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={card.description}
                    onChange={e => setSiteDraft(p => ({ ...p, manifestoCards: p.manifestoCards.map((item, i) => i === index ? { ...item, description: e.target.value } : item) }))}
                    className={inputCls}
                    placeholder="Explain this publishing standard"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSiteDraft(p => ({
                  ...p,
                  manifestoCards: [...p.manifestoCards, { number: String(p.manifestoCards.length + 1).padStart(2, '0'), title: 'New Standard', description: 'Describe this publishing standard.' }],
                }))}
                className="text-xs font-mono font-semibold text-[#C8862A] hover:underline"
              >
                + Add publishing standard
              </button>
            </div>
          </section>

          {/* Catalogue Copy */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">📖 Catalogue Section</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Catalogue Eyebrow</label>
                <input
                  type="text"
                  value={siteDraft.catalogueEyebrow}
                  onChange={e => setSiteDraft(p => ({ ...p, catalogueEyebrow: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Catalogue Heading</label>
                <input
                  type="text"
                  value={siteDraft.catalogueHeading}
                  onChange={e => setSiteDraft(p => ({ ...p, catalogueHeading: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Catalogue Summary</label>
                <textarea
                  rows={2}
                  value={siteDraft.catalogueSummary}
                  onChange={e => setSiteDraft(p => ({ ...p, catalogueSummary: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Founder / The Mind Behind Section */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">👤 The Mind Behind Nexa Growth Studio</h3>
              <p className="text-xs text-slate-400 mt-0.5">Customize the founder feature section on the homepage.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Founder Name</label>
                <input
                  type="text"
                  value={siteDraft.founderName}
                  onChange={e => setSiteDraft(p => ({ ...p, founderName: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Founder Role / Title</label>
                <input
                  type="text"
                  value={siteDraft.founderRole}
                  onChange={e => setSiteDraft(p => ({ ...p, founderRole: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Founder Section Top Eyebrow</label>
                <input
                  type="text"
                  value={siteDraft.founderBadge}
                  onChange={e => setSiteDraft(p => ({ ...p, founderBadge: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Founder Photo Upload */}
            <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">Founder Portrait Photo</label>
              <div className="flex items-center gap-5 flex-wrap">
                {siteDraft.founderPhoto ? (
                  <img
                    src={siteDraft.founderPhoto}
                    alt="Founder preview"
                    className="w-20 h-24 object-cover rounded-xl border border-slate-700 shadow"
                  />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-slate-600 font-[Space_Grotesk]">
                    No Photo
                  </div>
                )}
                <div className="space-y-2">
                  <label className="inline-block bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition">
                    {uploadingPhoto ? 'Processing photo...' : 'Upload Founder Photo'}
                    <input type="file" accept="image/*" onChange={handleFounderPhotoUpload} className="hidden" />
                  </label>
                  {siteDraft.founderPhoto && (
                    <button
                      type="button"
                      onClick={() => setSiteDraft(p => ({ ...p, founderPhoto: '' }))}
                      className="block text-xs text-red-400 hover:underline"
                    >
                      Remove photo (fallback to monogram)
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500">Optimized and saved to your live studio settings. It will display on the homepage automatically.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Founder Headline Quote</label>
              <input
                type="text"
                value={siteDraft.founderQuote}
                onChange={e => setSiteDraft(p => ({ ...p, founderQuote: e.target.value }))}
                className={inputCls}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Story Paragraph 1</label>
                <textarea
                  rows={3}
                  value={siteDraft.founderBioParagraph1}
                  onChange={e => setSiteDraft(p => ({ ...p, founderBioParagraph1: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Story Paragraph 2</label>
                <textarea
                  rows={3}
                  value={siteDraft.founderBioParagraph2}
                  onChange={e => setSiteDraft(p => ({ ...p, founderBioParagraph2: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Subject Tags (Comma-separated)</label>
              <input
                type="text"
                value={siteDraft.founderTags.join(', ')}
                onChange={e => setSiteDraft(p => ({ ...p, founderTags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                className={inputCls}
              />
            </div>
          </section>

          {/* Sister / General Publishing Website */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">🌐 Other Publishing Website</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add a button that redirects visitors to your separate website for general books, fiction, children’s books, inspirational titles, and other non-business publications.
            </p>
            <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={siteDraft.otherSiteEnabled}
                onChange={e => setSiteDraft(p => ({ ...p, otherSiteEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-[#C8862A]"
              />
              Show the other website button on the homepage
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Website Name</label>
                <input
                  type="text"
                  value={siteDraft.otherSiteName}
                  onChange={e => setSiteDraft(p => ({ ...p, otherSiteName: e.target.value }))}
                  className={inputCls}
                  placeholder="Nexa General Books"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Button Text</label>
                <input
                  type="text"
                  value={siteDraft.otherSiteButtonText}
                  onChange={e => setSiteDraft(p => ({ ...p, otherSiteButtonText: e.target.value }))}
                  className={inputCls}
                  placeholder="Visit General Books"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Full Website URL</label>
                <input
                  type="url"
                  value={siteDraft.otherSiteUrl}
                  onChange={e => setSiteDraft(p => ({ ...p, otherSiteUrl: e.target.value }))}
                  className={inputCls}
                  placeholder="https://your-other-book-website.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Description</label>
                <textarea
                  rows={2}
                  value={siteDraft.otherSiteDescription}
                  onChange={e => setSiteDraft(p => ({ ...p, otherSiteDescription: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Contact & Dispatch */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">💬 Contact & Footer Dispatch</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Contact WhatsApp Number</label>
                <input
                  type="text"
                  value={siteDraft.contactWhatsapp}
                  onChange={e => setSiteDraft(p => ({ ...p, contactWhatsapp: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Official Studio Email</label>
                <input
                  type="email"
                  value={siteDraft.officialEmail}
                  onChange={e => setSiteDraft(p => ({ ...p, officialEmail: e.target.value }))}
                  className={inputCls}
                  placeholder="nexagrowthstudio.ng@gmail.com"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Copyright Label</label>
                <input
                  type="text"
                  value={siteDraft.copyrightText}
                  onChange={e => setSiteDraft(p => ({ ...p, copyrightText: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Dispatch Box Heading</label>
                <input
                  type="text"
                  value={siteDraft.newsletterHeading}
                  onChange={e => setSiteDraft(p => ({ ...p, newsletterHeading: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Dispatch Box Subtitle</label>
                <textarea
                  rows={2}
                  value={siteDraft.newsletterSubtitle}
                  onChange={e => setSiteDraft(p => ({ ...p, newsletterSubtitle: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Dispatch Eyebrow</label>
                <input
                  type="text"
                  value={siteDraft.contactEyebrow}
                  onChange={e => setSiteDraft(p => ({ ...p, contactEyebrow: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">WhatsApp Button Text</label>
                <input
                  type="text"
                  value={siteDraft.contactWhatsappCta}
                  onChange={e => setSiteDraft(p => ({ ...p, contactWhatsappCta: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Email Button Text</label>
                <input
                  type="text"
                  value={siteDraft.contactEmailCta}
                  onChange={e => setSiteDraft(p => ({ ...p, contactEmailCta: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <button
            onClick={handleSaveFrontpage}
            disabled={savingFrontpage}
            className="w-full bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-sm py-4 rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {savingFrontpage ? 'Saving & Broadcasting...' : 'Save Front Page Changes'}
          </button>
        </div>
      )}

      {/* TAB 3: SETTINGS & PASSWORDS */}
      {mainTab === 'settings' && (
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Mega admin passcode */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A] mb-1">🔐 Mega Admin Password</h2>
            <p className="text-xs text-slate-400 mb-4">This passcode unlocks the full publishing console at <code className="text-slate-200">#/admin</code>.</p>
            <form onSubmit={handleMegaPassChange} className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Current Passcode</label>
                <input type={showPass ? 'text' : 'password'} value={curPass} onChange={e => setCurPass(e.target.value)} className={inputCls} placeholder="••••••" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">New Passcode (min 6)</label>
                <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} className={inputCls} placeholder="New passcode" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Confirm New</label>
                <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className={inputCls} placeholder="Repeat passcode" />
              </div>
              <div className="sm:col-span-3 flex items-center gap-3 flex-wrap pt-1">
                <button type="submit" className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition">Update Mega Password</button>
                <button type="button" onClick={() => setShowPass(s => !s)} className="text-xs text-slate-400 hover:text-slate-200 font-mono">{showPass ? 'Hide' : 'Show'} passcodes</button>
                {passMsg && <span className={`text-xs ${passMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{passMsg.text}</span>}
              </div>
            </form>
          </section>

          {/* Book-level access codes */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A] mb-1">📖 Individual Book Access Codes</h2>
            <p className="text-xs text-slate-400 mb-4">Each book has its own admin dashboard passcode and WhatsApp dispatch number.</p>
            {books.length === 0 && <p className="text-xs text-slate-500">No books created yet.</p>}
            <div className="space-y-3">
              {books.map(b => (
                <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-3 truncate">{b.title} <span className="text-[10px] font-mono text-slate-500 ml-1">#/admin/book/{b.slug}</span></p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Admin Passcode</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={getAccessVal(b, 'passcode')}
                        onChange={e => setBookAccess(p => ({ ...p, [b.id]: { passcode: e.target.value, whatsapp: getAccessVal(b, 'whatsapp') } }))}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">WhatsApp Order Number</label>
                      <input
                        type="text"
                        value={getAccessVal(b, 'whatsapp')}
                        onChange={e => setBookAccess(p => ({ ...p, [b.id]: { passcode: getAccessVal(b, 'passcode'), whatsapp: e.target.value } }))}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                  </div>
                  <button onClick={() => handleSaveBookAccess(b.id)} className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition">Save Access for this Book</button>
                </div>
              ))}
            </div>
            {accessMsg && <p className="text-xs text-emerald-400 mt-3">{accessMsg}</p>}
          </section>

          {/* Cloud Connection */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A] mb-1">☁️ Realtime Cloud Synchronization</h2>
            <p className="text-xs text-slate-400 mb-3">
              Connected to Firebase Realtime Database. Catalog and lead records broadcast across all devices in real time.
              {lastSync && <span className="block mt-1 font-mono text-[11px] text-slate-500">Last synchronized: {new Date(lastSync).toLocaleString()}</span>}
            </p>
            <input
              type="text"
              value={dbUrl}
              readOnly
              className={`${inputCls} font-mono mb-3 opacity-70 cursor-not-allowed`}
            />
            <div className="flex flex-wrap gap-2">
              <button onClick={handleTest} disabled={syncBusy !== 'idle'} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50">
                {syncBusy === 'testing' ? 'Testing connection...' : 'Test Cloud Connection'}
              </button>
              <button onClick={handlePush} disabled={syncBusy !== 'idle'} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50">
                {syncBusy === 'pushing' ? 'Uploading...' : 'Force Sync to Cloud'}
              </button>
              <button onClick={handlePull} disabled={syncBusy !== 'idle'} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-xl transition disabled:opacity-50">
                {syncBusy === 'pulling' ? 'Downloading...' : 'Re-download Cloud Catalog'}
              </button>
            </div>
            {syncMsg && <p className={`text-xs mt-3 ${syncMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{syncMsg.text}</p>}
          </section>

          {/* Backup */}
          <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A] mb-1">💾 Export / Backup Database</h2>
            <p className="text-xs text-slate-400 mb-4">Download a full JSON backup of all published books, leads, and frontpage configurations.</p>
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={handleExport} className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-4 py-2 rounded-xl transition">⬇ Download Backup (JSON)</button>
              <label className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer">
                ⬆ Restore from File
                <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
              </label>
              {backupMsg && <span className="text-xs text-slate-300 ml-2">{backupMsg}</span>}
            </div>
          </section>
        </div>
      )}

      {/* Modal: Create Book */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6 py-8 overflow-y-auto" onClick={() => setCreateOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-xl w-full shadow-2xl relative my-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#C8862A] mb-1">Create New Book</h3>
            <p className="text-xs text-slate-400 mb-5">Set up your book’s landing page. You can customize all copy later.</p>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                type="button"
                onClick={() => handleTypeChange('free')}
                className={`py-3 rounded-xl text-sm font-bold border transition ${
                  bookType === 'free' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                🆓 Free Book
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('paid')}
                className={`py-3 rounded-xl text-sm font-bold border transition ${
                  bookType === 'paid' ? 'bg-[#C8862A]/20 border-[#C8862A] text-[#C8862A]' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                💰 Paid Book
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Title *</label>
                <input
                  type="text"
                  value={draft.title || ''}
                  onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. The Small Business Sales Book"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Subtitle</label>
                <textarea
                  value={draft.subtitle || ''}
                  onChange={e => setDraft(p => ({ ...p, subtitle: e.target.value }))}
                  placeholder="A clear, practical premise..."
                  className={inputCls}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Author Name</label>
                  <input
                    type="text"
                    value={draft.author || ''}
                    onChange={e => setDraft(p => ({ ...p, author: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Admin WhatsApp *</label>
                  <input
                    type="text"
                    value={draft.adminWhatsapp || ''}
                    onChange={e => setDraft(p => ({ ...p, adminWhatsapp: e.target.value }))}
                    placeholder="+2349030192034"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Book Admin Passcode *</label>
                  <input
                    type="text"
                    value={draft.adminPasscode || ''}
                    onChange={e => setDraft(p => ({ ...p, adminPasscode: e.target.value }))}
                    placeholder="Enter passcode"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                {bookType === 'paid' && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Price (₦)</label>
                    <input
                      type="number"
                      value={draft.payment?.price || ''}
                      onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, price: Number(e.target.value) } }))}
                      placeholder="e.g. 5000"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              {bookType === 'paid' && (
                <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/70 space-y-3">
                  <label className="text-[10px] uppercase tracking-wider text-[#C8862A] block font-bold font-mono">💳 Payment Account</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Account Name</label>
                      <input
                        type="text"
                        value={draft.payment?.accountName || ''}
                        onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, accountName: e.target.value } }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Account Number</label>
                      <input
                        type="text"
                        value={draft.payment?.accountNumber || ''}
                        onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, accountNumber: e.target.value } }))}
                        className={`${inputCls} font-mono`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={draft.payment?.bankName || ''}
                        onChange={e => setDraft(p => ({ ...p, payment: { ...p.payment!, bankName: e.target.value } }))}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !draft.title?.trim()}
                className="w-full bg-[#C8862A] hover:bg-[#d8963a] disabled:opacity-50 text-slate-950 font-bold text-sm py-3.5 rounded-xl transition shadow-md mt-2"
              >
                {creating ? 'Creating...' : '🚀 Launch Book Page'}
              </button>
            </div>

            <button type="button" onClick={() => setCreateOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

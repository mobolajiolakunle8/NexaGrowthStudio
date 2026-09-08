import { useEffect, useState } from 'react';
import type { Book, Lead } from '../types';
import { saveLeads, loadLeads, downloadGuidePdf, normalizePhoneForWA } from '../storage';
import { deleteLeadInCloud, updateLeadInCloud, uploadBookAsset } from '../cloud';
import { PaymentProofUpload } from './PaymentProofUpload';

interface Props {
  book: Book;
  officialEmail: string;
  onUpdateBook: (updated: Book) => void;
  onBack: () => void;
}

export default function BookAdmin({ book, officialEmail, onUpdateBook, onBack }: Props) {
  const leads = loadLeads().filter(l => l.bookId === book.id);
  const [editBook, setEditBook] = useState<Book>(book);
  const [tab, setTab] = useState<'leads' | 'edit' | 'assets'>('leads');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredLeads = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.email.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search)
  );

  const handleUpdateLeadStatus = (id: string, status: Lead['status']) => {
    const all = loadLeads();
    const updated = all.map(l => l.id === id ? { ...l, status } : l);
    saveLeads(updated);
    void updateLeadInCloud(id, { status });
    if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, status });
  };

  const toDirectDownloadLink = (raw: string): string => {
    const url = raw.trim();
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    const openMatch = url.match(/[?&]id=([^&]+)/);
    if (openMatch && url.includes('drive.google.com')) return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
    return url;
  };

  const getDirectDownloadLink = () => {
    const link = editBook.customPdf || book.customPdf || '';
    return /^https?:\/\//i.test(link) ? link : '';
  };

  const hasEmbeddedPdf = () => {
    const link = editBook.customPdf || book.customPdf || '';
    return !!link && !/^https?:\/\//i.test(link);
  };

  const [manualLinkDraft, setManualLinkDraft] = useState<string>(getDirectDownloadLink());

  useEffect(() => {
    setManualLinkDraft(getDirectDownloadLink());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBook.customPdf, book.customPdf]);

  const applyManualLink = () => {
    const value = manualLinkDraft.trim();
    if (!value) {
      setEditBook(prev => ({ ...prev, customPdf: undefined }));
      setPdfMsg('Delivery link cleared.');
      return;
    }
    if (!/^https?:\/\//i.test(value)) {
      setPdfMsg('⚠️ That does not look like a valid link — it must start with https://');
      return;
    }
    const direct = toDirectDownloadLink(value);
    setEditBook(prev => ({ ...prev, customPdf: direct }));
    setPdfMsg('✓ Delivery link applied. Remember to click "Save Asset Changes".');
  };

  const notifyMissingHostedLink = () => {
    if (hasEmbeddedPdf()) {
      alert('This book has an attached PDF. For direct delivery links, paste a link in Assets & Files (Google Drive or hosted URL).');
    } else {
      alert('Attach a PDF or paste a link in Assets & Files (then click Save Asset Changes) before sending to customers.');
    }
  };

  const recordDelivery = (lead: Lead, channel: 'WhatsApp' | 'Email') => {
    const deliveredAt = new Date().toISOString();
    const changes: Partial<Lead> = { deliveredAt, deliveryChannel: channel };
    const updated = loadLeads().map(item => item.id === lead.id ? { ...item, ...changes } : item);
    saveLeads(updated);
    void updateLeadInCloud(lead.id, changes);
    setSelectedLead({ ...lead, ...changes });
  };

  const buildWhatsAppMessage = (lead: Lead): string => {
    const link = getDirectDownloadLink();
    if (link) {
      return [
        `✅ Payment confirmed!`,
        '',
        `Hi ${lead.name},`,
        '',
        `Your payment for "${book.title}" has been confirmed.`,
        ``,
        `Click to download your copy now: ${link}`,
        '',
        'Thank you for your purchase. Enjoy! 🎉',
        `— ${book.author}`,
      ].join('\n');
    }
    if (hasEmbeddedPdf()) {
      return [
        `✅ Payment confirmed!`,
        '',
        `Hi ${lead.name}, your payment for "${book.title}" has been confirmed.`,
        '',
        'Download your copy on the official book page here:',
        `${window.location.origin}${window.location.pathname}#/book/${book.slug}`,
        '',
        'Thank you for your purchase. — ' + book.author,
      ].join('\n');
    }
    return [
      `Hi ${lead.name},`,
      '',
      `Your payment for "${book.title}" has been received ✅`,
      '',
      'Your download will be sent shortly. Thank you!',
      `— ${book.author}`,
    ].join('\n');
  };

  const handleMarkPaid = (id: string) => {
    const paymentConfirmedAt = new Date().toISOString();
    const all = loadLeads();
    const updated = all.map(l => l.id === id ? { ...l, paid: true, paymentConfirmedAt, status: 'Qualified' as const } : l);
    saveLeads(updated);

    const target = updated.find(l => l.id === id);

    if (target) {
      const message = buildWhatsAppMessage(target);
      const digits = normalizePhoneForWA(target.phone);
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      recordDelivery(target, 'WhatsApp');
    }

    void updateLeadInCloud(id, { paid: true, paymentConfirmedAt, status: 'Qualified' });
    if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, paid: true, paymentConfirmedAt, status: 'Qualified' });
  };

  const sendPaidBookViaWhatsApp = (lead: Lead) => {
    const link = getDirectDownloadLink();
    if (!link) {
      notifyMissingHostedLink();
      return;
    }
    const message = [
      `Hi ${lead.name},`,
      '',
      `Your payment for "${book.title}" has been confirmed.`,
      `Download your book here: ${link}`,
      '',
      'Thank you for your purchase.',
      `${book.author}`,
    ].join('\n');
    window.open(`https://wa.me/${normalizePhoneForWA(lead.phone)}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    recordDelivery(lead, 'WhatsApp');
  };

  const sendPaidBookViaEmail = (lead: Lead) => {
    const link = getDirectDownloadLink();
    if (!link) {
      notifyMissingHostedLink();
      return;
    }
    const subject = `Your copy of ${book.title}`;
    const body = [
      `Hi ${lead.name},`,
      '',
      `Your payment for "${book.title}" has been confirmed.`,
      '',
      `Download your book here: ${link}`,
      '',
      'Thank you for your purchase.',
      book.author,
    ].join('\n');
    window.location.href = `mailto:${encodeURIComponent(lead.email)}?cc=${encodeURIComponent(officialEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    recordDelivery(lead, 'Email');
  };

  const copyPaidBookLink = async () => {
    const link = getDirectDownloadLink();
    if (!link) {
      notifyMissingHostedLink();
      return;
    }
    await navigator.clipboard.writeText(link);
    alert('Direct download link copied.');
  };

  const handleDeleteLead = (id: string) => {
    if (confirm('Delete this lead?')) {
      const updated = loadLeads().filter(l => l.id !== id);
      saveLeads(updated);
      void deleteLeadInCloud(id);
      setSelectedLead(null);
    }
  };

  const handleSaveBook = () => {
    setSaving(true);
    const finalBook: Book = {
      ...editBook,
      customPdf: manualLinkDraft.trim() ? toDirectDownloadLink(manualLinkDraft) : editBook.customPdf,
    };
    setEditBook(finalBook);
    onUpdateBook(finalBook);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); }, 400);
  };

  const [coverBusy, setCoverBusy] = useState(false);
  const [coverMsg, setCoverMsg] = useState<string | null>(null);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);

  const handleBookCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverBusy(true);
    setCoverMsg(null);
    try {
      const { compressImageFile, approxDataUrlKB } = await import('../storage');
      const compressed = await compressImageFile(file, 800, 0.78);
      const kb = approxDataUrlKB(compressed);
      if (kb > 400) {
        setCoverMsg('Image too large. Please pick a smaller image under 1.5MB.');
        return;
      }
      setEditBook(prev => ({ ...prev, coverImage: compressed }));
      setCoverMsg(`✓ Cover attached (~${kb}KB). Click "Save Asset Changes" to broadcast.`);
    } catch {
      setCoverMsg('Could not read image file.');
    } finally {
      setCoverBusy(false);
      e.target.value = '';
    }
  };

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeMB = file.size / 1024 / 1024;
    setPdfMsg(sizeMB <= 1 ? 'Reading PDF…' : 'Uploading PDF...');

    try {
      if (sizeMB <= 1) {
        const { fileToDataUrl } = await import('../storage');
        const dataUrl = await fileToDataUrl(file);
        setEditBook(prev => ({ ...prev, customPdf: dataUrl }));
        setPdfMsg(`✓ PDF attached (${sizeMB.toFixed(1)}MB). Click "Save Asset Changes" to save.`);
      } else {
        try {
          const url = await uploadBookAsset(book.id, 'pdf', file, file.name);
          setEditBook(prev => ({ ...prev, customPdf: url }));
          setPdfMsg(`✓ PDF uploaded to cloud (${sizeMB.toFixed(1)}MB).`);
        } catch {
          setPdfMsg(`⚠️ Upload failed. Use the manual link space below to paste a Google Drive link.`);
        }
      }
    } catch {
      setPdfMsg('Could not read that PDF.');
    }
    e.target.value = '';
  };

  const exportCsv = () => {
    const headers = ['Name', 'Email', 'Phone', 'Date', 'Status', 'Paid', 'Payment Confirmed', 'Delivered', 'Channel'];
    const rows = leads.map(l => [
      l.name,
      l.email,
      l.phone,
      new Date(l.date).toLocaleString(),
      l.status,
      String(l.paid ?? 'N/A'),
      l.paymentConfirmedAt ? new Date(l.paymentConfirmedAt).toLocaleString() : '',
      l.deliveredAt ? new Date(l.deliveredAt).toLocaleString() : '',
      l.deliveryChannel || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${book.slug}-leads.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/book/${book.slug}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-[Inter] selection:bg-[#C8862A] selection:text-slate-950">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${
            book.type === 'free' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#C8862A]/20 text-[#C8862A] border border-[#C8862A]/30'
          }`}>
            {book.type.toUpperCase()}
          </span>
          <h1 className="font-[Space_Grotesk] font-bold text-base md:text-lg tracking-tight truncate text-white">{book.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition">
            ← Studio Console
          </button>
        </div>
      </header>

      {/* Share Banner */}
      <div className="bg-slate-950/70 border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs text-slate-400 shrink-0 font-[JetBrains_Mono] uppercase tracking-wider">Public Link:</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <code className="text-xs text-[#C8862A] bg-black/40 px-3 py-1.5 rounded-lg flex-1 truncate border border-slate-800 font-mono">{shareUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Public link copied to clipboard!'); }}
            className="text-xs bg-[#C8862A] text-slate-950 font-bold px-3 py-1.5 rounded-lg hover:bg-[#d8963a] transition shrink-0"
          >
            Copy
          </button>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition shrink-0 no-underline border border-slate-700">Preview</a>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-6">
        {(['leads', 'edit', 'assets'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3.5 text-xs font-bold capitalize tracking-wider border-b-2 transition-colors ${
              tab === t ? 'border-[#C8862A] text-[#C8862A]' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'leads' ? `Leads & Orders (${leads.length})` : t === 'edit' ? 'Edit Copy' : 'Assets & PDF Links'}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {tab === 'leads' && (
          <>
            <section className="flex-1 p-6 flex flex-col gap-4 border-r border-slate-800 overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-[Space_Grotesk] text-lg font-bold text-white">Audience & Customers</h2>
                  <div className="flex gap-3 mt-1 text-xs text-slate-400 font-mono">
                    <span>Total: <b className="text-white">{leads.length}</b></span>
                    {book.type === 'paid' && <span>Paid: <b className="text-emerald-400">{leads.filter(l => l.paid).length}</b></span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="Search by name, email, phone..." value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-[#C8862A] text-white w-52"
                  />
                  <button onClick={exportCsv} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition">📥 CSV</button>
                </div>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <span className="text-4xl mb-2">📥</span>
                  <p className="text-sm font-semibold text-white">No entries yet</p>
                  <p className="text-xs text-slate-500 mt-1">When customers request or order this book, their records will accumulate here in real time.</p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
                          <th className="p-4">Customer</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4">Submitted</th>
                          <th className="p-4">Status</th>
                          {book.type === 'paid' && <th className="p-4">Payment</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} onClick={() => setSelectedLead(lead)} className={`cursor-pointer hover:bg-slate-900/60 transition ${selectedLead?.id === lead.id ? 'bg-slate-900/90 border-l-2 border-[#C8862A]' : ''}`}>
                            <td className="p-4"><div className="font-semibold text-white">{lead.name}</div></td>
                            <td className="p-4"><div>{lead.email}</div><div className="text-slate-400 font-mono text-[11px] mt-0.5">{lead.phone}</div></td>
                            <td className="p-4 text-slate-400 font-mono text-[11px]">{new Date(lead.date).toLocaleDateString()}</td>
                            <td className="p-4">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${lead.status === 'New' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : lead.status === 'Contacted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>{lead.status}</span>
                            </td>
                            {book.type === 'paid' && (
                              <td className="p-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${lead.paid ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'}`}>{lead.paid ? '✓ Paid' : 'Awaiting'}</span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            {/* Lead Details Sidebar */}
            <section className="w-full lg:w-88 bg-slate-950 p-6 flex flex-col gap-4 overflow-y-auto border-t lg:border-t-0 border-slate-800">
              {selectedLead ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="font-[Space_Grotesk] font-bold text-white">Customer Record</h2>
                    <button onClick={() => handleDeleteLead(selectedLead.id)} className="text-red-400 hover:text-red-300 text-xs">🗑 Delete</button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-sm">
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Full Name</label><span className="text-white font-semibold">{selectedLead.name}</span></div>
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Email Address</label><a href={`mailto:${selectedLead.email}`} className="text-[#C8862A] hover:underline break-all">{selectedLead.email}</a></div>
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Phone Number</label><a href={`tel:${selectedLead.phone}`} className="text-[#C8862A] hover:underline font-mono">{selectedLead.phone}</a></div>
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Timestamp</label><span className="text-slate-400 text-xs font-mono">{new Date(selectedLead.date).toLocaleString()}</span></div>

                    <PaymentProofUpload
                      existingUrl={(selectedLead as any).paymentProofUrl}
                      onUploadComplete={(proofUrl) => {
                        if (!proofUrl) return;
                        const updated = loadLeads().map(l => l.id === selectedLead.id ? { ...l, paymentProofUrl: proofUrl } : l);
                        saveLeads(updated);
                        void updateLeadInCloud(selectedLead.id, { paymentProofUrl: proofUrl });
                        setSelectedLead({ ...selectedLead, paymentProofUrl: proofUrl } as any);
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">Engagement Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['New', 'In Progress', 'Contacted', 'Qualified', 'Unqualified'] as const).map(s => (
                        <button key={s} onClick={() => handleUpdateLeadStatus(selectedLead.id, s)}
                          className={`px-2 py-2 rounded-xl text-xs font-medium border text-center transition ${selectedLead.status === s ? 'bg-[#C8862A] border-[#C8862A] text-slate-950 font-bold' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'}`}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {book.type === 'paid' && !selectedLead.paid && (
                    <button onClick={() => handleMarkPaid(selectedLead.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-md">
                      ✓ Confirm Payment & Open WhatsApp
                    </button>
                  )}

                  {book.type === 'paid' && selectedLead.paid && (
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-emerald-400">✓ Payment Confirmed</p>
                        {selectedLead.paymentConfirmedAt && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(selectedLead.paymentConfirmedAt).toLocaleString()}</p>
                        )}
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => sendPaidBookViaWhatsApp(selectedLead)}
                          className="w-full rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                        >
                          📲 Re-send on WhatsApp
                        </button>
                        <button
                          onClick={() => sendPaidBookViaEmail(selectedLead)}
                          className="w-full rounded-xl bg-[#C8862A] py-2.5 text-xs font-bold text-slate-950 transition hover:opacity-90"
                        >
                          📧 Send via Email
                        </button>
                        <button
                          onClick={() => void copyPaidBookLink()}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-medium text-white transition hover:bg-slate-700 font-mono"
                        >
                          🔗 Copy Download Link
                        </button>
                      </div>

                      {selectedLead.deliveredAt && (
                        <p className="text-[10px] text-emerald-400 font-mono border-t border-emerald-500/20 pt-2">
                          Sent via {selectedLead.deliveryChannel} on {new Date(selectedLead.deliveredAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}

                  {book.type === 'free' && (
                    <button onClick={() => downloadGuidePdf(selectedLead.name, book)} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium py-2.5 rounded-xl border border-slate-700 transition">
                      📄 Trigger Local PDF Download
                    </button>
                  )}

                  <a
                    href={`https://wa.me/${selectedLead.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${selectedLead.name}, following up regarding "${book.title}".`)}`}
                    target="_blank" rel="noreferrer"
                    className="w-full bg-[#25D366] text-white font-bold text-xs py-2.5 rounded-xl text-center hover:opacity-90 transition no-underline block"
                  >
                    💬 Direct WhatsApp Conversation
                  </a>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                  <span className="text-2xl mb-2">👉</span>
                  <p className="text-sm font-semibold text-white">Select a customer</p>
                  <p className="text-xs text-slate-500 mt-1">Click any entry on the left to confirm payments and dispatch links.</p>
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'edit' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <h2 className="font-[Space_Grotesk] text-lg font-bold text-white">Book Copy &amp; Messaging</h2>
                <button onClick={handleSaveBook} disabled={saving} className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition disabled:opacity-50">
                  {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {[
                { label: 'Book Title', key: 'title', type: 'input' },
                { label: 'Subtitle / Core Promise', key: 'subtitle', type: 'textarea' },
                { label: 'Author / Editor Name', key: 'author', type: 'input' },
                { label: 'Author Role / Studio Affiliation', key: 'authorRole', type: 'input' },
                { label: 'Kicker (Top Eyebrow Badge)', key: 'kicker', type: 'input' },
                { label: 'CTA Section Heading', key: 'ctaTitle', type: 'input' },
                { label: 'CTA Subtitle', key: 'ctaSubtitle', type: 'textarea' },
                { label: 'Dispatch WhatsApp Number', key: 'adminWhatsapp', type: 'input' },
                { label: 'Book Admin Passcode', key: 'adminPasscode', type: 'input' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      value={(editBook as unknown as Record<string, string>)[key] || ''}
                      onChange={e => setEditBook(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white resize-none"
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={(editBook as unknown as Record<string, string>)[key] || ''}
                      onChange={e => setEditBook(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white font-mono"
                    />
                  )}
                </div>
              ))}

              {/* What's Inside */}
              <div className="pt-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">What You Will Master (Bullets)</label>
                <div className="flex flex-col gap-2.5">
                  {editBook.whatsInside.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text" value={p}
                        onChange={e => { const w = [...editBook.whatsInside]; w[i] = e.target.value; setEditBook(prev => ({ ...prev, whatsInside: w })); }}
                        className="flex-1 bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white"
                      />
                      <button onClick={() => setEditBook(prev => ({ ...prev, whatsInside: prev.whatsInside.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-300 px-3 py-2 text-sm">🗑</button>
                    </div>
                  ))}
                  <button onClick={() => setEditBook(prev => ({ ...prev, whatsInside: [...prev.whatsInside, 'New key takeaway...'] }))} className="text-[#C8862A] hover:underline text-xs font-medium py-1 self-start font-mono">+ Add Another Takeaway</button>
                </div>
              </div>

              {/* Paid / Free specifics */}
              {editBook.type === 'paid' && editBook.payment && (
                <div className="border-t border-slate-800 pt-5 space-y-4">
                  <label className="text-[10px] uppercase tracking-wider text-[#C8862A] block font-bold font-mono">💳 Bank Transfer Account Instructions</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['accountName', 'accountNumber', 'bankName', 'paymentNote'].map(k => (
                      <div key={k} className={k === 'paymentNote' ? 'col-span-2' : ''}>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">{k.replace(/([A-Z])/g, ' $1')}</label>
                        <input
                          type="text" value={(editBook.payment as unknown as Record<string, string>)[k] || ''}
                          onChange={e => setEditBook(prev => ({ ...prev, payment: { ...prev.payment!, [k]: e.target.value } }))}
                          className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Price</label>
                      <input type="number" value={editBook.payment.price || 0}
                        onChange={e => setEditBook(prev => ({ ...prev, payment: { ...prev.payment!, price: Number(e.target.value) } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Currency Symbol</label>
                      <input type="text" value={editBook.payment.currency || '₦'}
                        onChange={e => setEditBook(prev => ({ ...prev, payment: { ...prev.payment!, currency: e.target.value } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editBook.type === 'free' && editBook.donation && (
                <div className="border-t border-slate-800 pt-5 space-y-4">
                  <label className="text-[10px] uppercase tracking-wider text-[#C8862A] block font-bold font-mono">❤️ Free Download Appreciation Support</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['accountName', 'accountNumber', 'bankName', 'thankYouMessage', 'donationMessage'].map(k => (
                      <div key={k} className={['thankYouMessage', 'donationMessage'].includes(k) ? 'col-span-2' : ''}>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">{k.replace(/([A-Z])/g, ' $1')}</label>
                        {['thankYouMessage', 'donationMessage'].includes(k) ? (
                          <textarea
                            value={(editBook.donation as unknown as Record<string, string>)[k] || ''}
                            onChange={e => setEditBook(prev => ({ ...prev, donation: { ...prev.donation!, [k]: e.target.value } }))}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white resize-none" rows={2}
                          />
                        ) : (
                          <input type="text" value={(editBook.donation as unknown as Record<string, string>)[k] || ''}
                            onChange={e => setEditBook(prev => ({ ...prev, donation: { ...prev.donation!, [k]: e.target.value } }))}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSaveBook} disabled={saving} className="w-full bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-sm py-3.5 rounded-xl transition">
                {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save All Copy Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'assets' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-xl mx-auto space-y-6">
              <h2 className="font-[Space_Grotesk] text-lg font-bold text-white">Cover Artwork & Delivery Links</h2>

              {/* Cover Artwork */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
                <label className="text-[10px] uppercase tracking-wider text-[#C8862A] block mb-3 font-mono font-bold">📚 Book Cover Artwork</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {editBook.coverImage && <img src={editBook.coverImage} alt="Cover" className="w-20 h-28 object-cover rounded-xl border border-slate-700 shadow" />}
                  <label className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition">
                    {coverBusy ? 'Processing...' : 'Upload Cover Image'}
                    <input type="file" accept="image/*" onChange={handleBookCover} className="hidden" />
                  </label>
                  {editBook.coverImage && <button onClick={() => setEditBook(prev => ({ ...prev, coverImage: undefined }))} className="text-red-400 text-xs hover:underline">Remove</button>}
                </div>
                {coverMsg && <p className="text-[11px] text-emerald-400 mt-2 font-mono">{coverMsg}</p>}
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">...or direct image URL</label>
                  <input
                    type="url"
                    placeholder="https://.../cover.jpg"
                    value={editBook.coverImage && /^https?:\/\//i.test(editBook.coverImage) ? editBook.coverImage : ''}
                    onChange={e => setEditBook(prev => ({ ...prev, coverImage: e.target.value.trim() || undefined }))}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#C8862A] font-mono text-white"
                  />
                </div>
              </div>

              {/* Delivery PDF Link */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <label className="text-[10px] uppercase tracking-wider text-[#C8862A] block font-mono font-bold">📄 PDF Delivery Link & Attachment</label>
                
                {editBook.customPdf && (
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3">
                    <span className={`text-xs font-mono truncate ${/^https?:\/\//i.test(editBook.customPdf) ? 'text-[#C8862A]' : 'text-emerald-400'}`}>
                      ✓ {/^https?:\/\//i.test(editBook.customPdf) ? 'Permanent Hosted Link' : 'Direct Attachment'}
                    </span>
                    <button onClick={() => setEditBook(prev => ({ ...prev, customPdf: undefined }))} className="text-red-400 text-xs hover:underline shrink-0">Remove</button>
                  </div>
                )}

                {editBook.customPdf && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => downloadGuidePdf('Preview', { ...editBook })}
                      className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                    >
                      ⬇ Test Download
                    </button>
                    <span className="text-[11px] text-slate-500 font-mono">Verifies file integrity</span>
                  </div>
                )}

                {/* Manual Link Input */}
                <div className="rounded-xl border border-[#C8862A]/25 bg-[#C8862A]/5 p-4 space-y-2.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#C8862A] block font-mono">
                    🔗 Direct Download Link (Google Drive / Hosted)
                  </label>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Paste your Google Drive share link or hosted file URL. Google Drive links are automatically converted to direct download endpoints for seamless customer delivery.
                  </p>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view?usp=drive_link"
                    value={manualLinkDraft}
                    onChange={e => setManualLinkDraft(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#C8862A] font-mono text-white"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={applyManualLink}
                      className="rounded-xl bg-[#C8862A] px-4 py-2 text-xs font-bold text-slate-950 hover:bg-[#d8963a] transition"
                    >
                      Apply Link
                    </button>
                    {editBook.customPdf && (
                      <button
                        type="button"
                        onClick={() => { setEditBook(prev => ({ ...prev, customPdf: undefined })); setManualLinkDraft(''); setPdfMsg('Cleared.'); }}
                        className="rounded-xl border border-red-900/50 px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Small PDF Upload */}
                <div className="pt-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">...or upload PDF directly (≤ 1MB)</label>
                  <label className="inline-block bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition border border-slate-700">
                    Upload PDF File
                    <input type="file" accept=".pdf" onChange={handlePdf} className="hidden" />
                  </label>
                  {pdfMsg && <p className="text-[11px] text-[#C8862A] mt-2 font-mono">{pdfMsg}</p>}
                </div>
              </div>

              <button onClick={handleSaveBook} disabled={saving} className="w-full bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-sm py-4 rounded-xl transition shadow-lg">
                {saved ? '✓ Asset Changes Broadcasted!' : 'Save All Asset Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

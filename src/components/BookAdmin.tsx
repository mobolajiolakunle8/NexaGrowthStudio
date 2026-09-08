import { useState } from 'react';
import type { Book, Lead } from '../types';
import { saveLeads, loadLeads, downloadGuidePdf, normalizePhoneForWA } from '../storage';
import { deleteLeadInCloud, updateLeadInCloud, uploadBookAsset } from '../cloud';

interface Props {
  book: Book;
  onUpdateBook: (updated: Book) => void;
  onBack: () => void;
}

export default function BookAdmin({ book, onUpdateBook, onBack }: Props) {
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

  const handleMarkPaid = (id: string) => {
    const paymentConfirmedAt = new Date().toISOString();
    const all = loadLeads();
    const updated = all.map(l => l.id === id ? { ...l, paid: true, paymentConfirmedAt, status: 'Qualified' as const } : l);
    saveLeads(updated);
    void updateLeadInCloud(id, { paid: true, paymentConfirmedAt, status: 'Qualified' });
    if (selectedLead?.id === id) setSelectedLead({ ...selectedLead, paid: true, paymentConfirmedAt, status: 'Qualified' });
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
    onUpdateBook(editBook);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 400);
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
      const compressed = await compressImageFile(file, 900, 0.82);
      const kb = approxDataUrlKB(compressed);
      const blob = await fetch(compressed).then(response => response.blob());
      const url = await uploadBookAsset(book.id, 'cover', blob, file.name);
      setEditBook(prev => ({ ...prev, coverImage: url }));
      setCoverMsg(`Cover optimized to ~${kb}KB and uploaded for all browsers.`);
    } catch {
      setCoverMsg('Could not process that image. Try a JPG or PNG file.');
    }
    setCoverBusy(false);
    e.target.value = '';
  };

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfMsg(null);
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > 25) {
      setPdfMsg(`This PDF is ${sizeMB.toFixed(1)}MB. Use a file under 25MB or paste a hosted PDF link below.`);
      e.target.value = '';
      return;
    }
    try {
      const url = await uploadBookAsset(book.id, 'pdf', file, file.name);
      setEditBook(prev => ({ ...prev, customPdf: url }));
      setPdfMsg(`PDF uploaded (${sizeMB.toFixed(1)}MB). The permanent delivery link is ready.`);
    } catch {
      setPdfMsg('Could not read that PDF file.');
    }
    e.target.value = '';
  };

  const getDirectDownloadLink = () => {
    const link = editBook.customPdf || book.customPdf || '';
    return /^https?:\/\//i.test(link) ? link : '';
  };

  const recordDelivery = (lead: Lead, channel: 'WhatsApp' | 'Email') => {
    const deliveredAt = new Date().toISOString();
    const changes: Partial<Lead> = { deliveredAt, deliveryChannel: channel, status: 'Contacted' };
    const updated = loadLeads().map(item => item.id === lead.id ? { ...item, ...changes } : item);
    saveLeads(updated);
    void updateLeadInCloud(lead.id, changes);
    setSelectedLead({ ...lead, ...changes });
  };

  const sendPaidBookViaWhatsApp = (lead: Lead) => {
    const link = getDirectDownloadLink();
    if (!link) {
      alert('Upload the book PDF in Assets & Files, then save the asset changes before sending.');
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
      alert('Upload the book PDF in Assets & Files, then save the asset changes before sending.');
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
    window.location.href = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    recordDelivery(lead, 'Email');
  };

  const copyPaidBookLink = async () => {
    const link = getDirectDownloadLink();
    if (!link) {
      alert('Upload and save the book PDF first.');
      return;
    }
    await navigator.clipboard.writeText(link);
    alert('Direct download link copied.');
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="bg-amber-500 text-slate-950 font-bold text-xs px-2 py-1 rounded shrink-0">{book.type.toUpperCase()}</span>
          <h1 className="font-[Space_Grotesk] font-bold text-base md:text-lg tracking-tight truncate">{book.title}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onBack} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 transition">← All Books</button>
        </div>
      </header>

      {/* Share Banner */}
      <div className="bg-slate-800/60 border-b border-slate-800 px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-xs text-slate-400 shrink-0">Share this landing page:</span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <code className="text-xs text-amber-400 bg-slate-950 px-3 py-1.5 rounded flex-1 truncate border border-slate-800">{shareUrl}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); }}
            className="text-xs bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg hover:bg-amber-400 transition shrink-0"
          >
            Copy
          </button>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600 transition shrink-0">Preview</a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-6">
        {(['leads', 'edit', 'assets'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-semibold capitalize tracking-wide border-b-2 transition ${
              tab === t ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'leads' ? `Leads (${leads.length})` : t === 'edit' ? 'Edit Content' : 'Assets & Files'}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {tab === 'leads' && (
          <>
            <section className="flex-1 p-6 flex flex-col gap-4 border-r border-slate-800 overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-[Space_Grotesk] text-lg font-bold">Prospect List</h2>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-slate-400">Total: <b className="text-white">{leads.length}</b></span>
                    {book.type === 'paid' && <span className="text-xs text-slate-400">Paid: <b className="text-emerald-400">{leads.filter(l => l.paid).length}</b></span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-white w-44"
                  />
                  <button onClick={exportCsv} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg border border-slate-700 transition">📥 CSV</button>
                </div>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-sm font-semibold">No leads yet</p>
                  <p className="text-xs text-slate-500 mt-1">Share your landing page link to start collecting leads.</p>
                </div>
              ) : (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <th className="p-4 font-semibold uppercase">Name</th>
                          <th className="p-4 font-semibold uppercase">Contact</th>
                          <th className="p-4 font-semibold uppercase">Date</th>
                          <th className="p-4 font-semibold uppercase">Status</th>
                          {book.type === 'paid' && <th className="p-4 font-semibold uppercase">Paid</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredLeads.map(lead => (
                          <tr key={lead.id} onClick={() => setSelectedLead(lead)} className={`cursor-pointer hover:bg-slate-900/60 transition ${selectedLead?.id === lead.id ? 'bg-slate-900/90 border-l-2 border-amber-500' : ''}`}>
                            <td className="p-4"><div className="font-semibold text-white">{lead.name}</div></td>
                            <td className="p-4"><div>{lead.email}</div><div className="text-slate-400">{lead.phone}</div></td>
                            <td className="p-4 text-slate-400">{new Date(lead.date).toLocaleDateString()}</td>
                            <td className="p-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${lead.status === 'New' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : lead.status === 'Contacted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700/30 text-slate-400 border border-slate-700'}`}>{lead.status}</span>
                            </td>
                            {book.type === 'paid' && (
                              <td className="p-4">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${lead.paid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{lead.paid ? '✓ Paid' : 'Unpaid'}</span>
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

            {/* Lead Detail */}
            <section className="w-full lg:w-80 bg-slate-950 p-6 flex flex-col gap-4 overflow-y-auto border-t lg:border-t-0 border-slate-800">
              {selectedLead ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="font-[Space_Grotesk] font-bold">Lead Details</h2>
                    <button onClick={() => handleDeleteLead(selectedLead.id)} className="text-red-400 hover:text-red-300 text-xs">🗑 Delete</button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-sm">
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block">Name</label><span className="text-white font-semibold">{selectedLead.name}</span></div>
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block">Email</label><a href={`mailto:${selectedLead.email}`} className="text-amber-400 hover:underline">{selectedLead.email}</a></div>
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block">Phone</label><a href={`tel:${selectedLead.phone}`} className="text-amber-400 hover:underline">{selectedLead.phone}</a></div>
                    <div><label className="text-[10px] uppercase tracking-wider text-slate-400 block">Date</label><span className="text-slate-300 text-xs">{new Date(selectedLead.date).toLocaleString()}</span></div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['New', 'In Progress', 'Contacted', 'Qualified', 'Unqualified'] as const).map(s => (
                        <button key={s} onClick={() => handleUpdateLeadStatus(selectedLead.id, s)}
                          className={`px-2 py-2 rounded-lg text-xs font-medium border text-center transition ${selectedLead.status === s ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'}`}
                        >{s}</button>
                      ))}
                    </div>
                  </div>

                  {book.type === 'paid' && !selectedLead.paid && (
                    <button onClick={() => handleMarkPaid(selectedLead.id)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-lg transition">✓ Mark as Paid</button>
                  )}

                  {book.type === 'paid' && selectedLead.paid && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="mb-3">
                        <p className="text-xs font-bold text-emerald-400">Payment confirmed</p>
                        {selectedLead.paymentConfirmedAt && (
                          <p className="mt-1 text-[10px] text-slate-500">{new Date(selectedLead.paymentConfirmedAt).toLocaleString()}</p>
                        )}
                      </div>

                      {getDirectDownloadLink() ? (
                        <>
                          <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                            Send the permanent book link directly to this customer.
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => sendPaidBookViaWhatsApp(selectedLead)}
                              className="w-full rounded-lg bg-[#25D366] py-2.5 text-xs font-bold text-white transition hover:bg-[#1eb857]"
                            >
                              Send book via WhatsApp
                            </button>
                            <button
                              onClick={() => sendPaidBookViaEmail(selectedLead)}
                              className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
                            >
                              Send book via email
                            </button>
                            <button
                              onClick={() => void copyPaidBookLink()}
                              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-xs font-medium text-white transition hover:bg-slate-700"
                            >
                              Copy direct download link
                            </button>
                          </div>
                          {selectedLead.deliveredAt && (
                            <p className="mt-3 text-[10px] text-emerald-400">
                              Delivery opened via {selectedLead.deliveryChannel} on {new Date(selectedLead.deliveredAt).toLocaleString()}.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] leading-relaxed text-amber-400">
                          No permanent PDF link is available. Upload the PDF in Assets &amp; Files and save the book first.
                        </p>
                      )}
                    </div>
                  )}

                  {book.type === 'free' && (
                    <button onClick={() => downloadGuidePdf(selectedLead.name, book)} className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium py-2.5 rounded-lg border border-slate-700 transition">📄 Send PDF Manually</button>
                  )}

                  <a
                    href={`https://wa.me/${selectedLead.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${selectedLead.name}, following up on "${book.title}".`)}`}
                    target="_blank" rel="noreferrer"
                    className="w-full bg-[#25D366] text-white font-bold text-xs py-2.5 rounded-lg text-center hover:bg-[#1eb857] transition no-underline"
                  >
                    💬 WhatsApp Follow-Up
                  </a>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                  <span className="text-2xl mb-2">👉</span>
                  <p className="text-sm font-semibold">Select a lead</p>
                  <p className="text-xs text-slate-500 mt-1">Click any row to view details.</p>
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'edit' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="font-[Space_Grotesk] text-lg font-bold">Edit Book Content</h2>
                <button onClick={handleSaveBook} disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg transition disabled:opacity-50">
                  {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {[
                { label: 'Book Title', key: 'title', type: 'input' },
                { label: 'Subtitle', key: 'subtitle', type: 'textarea' },
                { label: 'Author Name', key: 'author', type: 'input' },
                { label: 'Author Role', key: 'authorRole', type: 'input' },
                { label: 'Kicker (top label)', key: 'kicker', type: 'input' },
                { label: 'CTA Title', key: 'ctaTitle', type: 'input' },
                { label: 'CTA Subtitle', key: 'ctaSubtitle', type: 'textarea' },
                { label: 'Admin WhatsApp', key: 'adminWhatsapp', type: 'input' },
                { label: 'Admin Passcode', key: 'adminPasscode', type: 'input' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      value={(editBook as unknown as Record<string, string>)[key] || ''}
                      onChange={e => setEditBook(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                      rows={3}
                    />
                  ) : (
                    <input
                      type="text"
                      value={(editBook as unknown as Record<string, string>)[key] || ''}
                      onChange={e => setEditBook(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  )}
                </div>
              ))}

              {/* What's Inside */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2">What's Inside Points</label>
                <div className="flex flex-col gap-2">
                  {editBook.whatsInside.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text" value={p}
                        onChange={e => { const w = [...editBook.whatsInside]; w[i] = e.target.value; setEditBook(prev => ({ ...prev, whatsInside: w })); }}
                        className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button onClick={() => setEditBook(prev => ({ ...prev, whatsInside: prev.whatsInside.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-300 px-3 py-2">🗑</button>
                    </div>
                  ))}
                  <button onClick={() => setEditBook(prev => ({ ...prev, whatsInside: [...prev.whatsInside, 'New point…'] }))} className="text-amber-400 hover:text-amber-300 text-xs font-medium py-2">+ Add Point</button>
                </div>
              </div>

              {/* Paid / Free specifics */}
              {editBook.type === 'paid' && editBook.payment && (
                <div className="border-t border-slate-800 pt-5">
                  <label className="text-[10px] uppercase tracking-wider text-amber-400 block mb-3">💳 Payment Details</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['accountName', 'accountNumber', 'bankName', 'paymentNote'].map(k => (
                      <div key={k} className={k === 'paymentNote' ? 'col-span-2' : ''}>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">{k.replace(/([A-Z])/g, ' $1')}</label>
                        <input
                          type="text" value={(editBook.payment as unknown as Record<string, string>)[k] || ''}
                          onChange={e => setEditBook(prev => ({ ...prev, payment: { ...prev.payment!, [k]: e.target.value } }))}
                          className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Price</label>
                      <input type="number" value={editBook.payment.price || 0}
                        onChange={e => setEditBook(prev => ({ ...prev, payment: { ...prev.payment!, price: Number(e.target.value) } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Currency Symbol</label>
                      <input type="text" value={editBook.payment.currency || '₦'}
                        onChange={e => setEditBook(prev => ({ ...prev, payment: { ...prev.payment!, currency: e.target.value } }))}
                        className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editBook.type === 'free' && editBook.donation && (
                <div className="border-t border-slate-800 pt-5">
                  <label className="text-[10px] uppercase tracking-wider text-amber-400 block mb-3">❤️ Donation / Support Details</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['accountName', 'accountNumber', 'bankName', 'thankYouMessage', 'donationMessage'].map(k => (
                      <div key={k} className={['thankYouMessage', 'donationMessage'].includes(k) ? 'col-span-2' : ''}>
                        <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">{k.replace(/([A-Z])/g, ' $1')}</label>
                        {['thankYouMessage', 'donationMessage'].includes(k) ? (
                          <textarea
                            value={(editBook.donation as unknown as Record<string, string>)[k] || ''}
                            onChange={e => setEditBook(prev => ({ ...prev, donation: { ...prev.donation!, [k]: e.target.value } }))}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none" rows={2}
                          />
                        ) : (
                          <input type="text" value={(editBook.donation as unknown as Record<string, string>)[k] || ''}
                            onChange={e => setEditBook(prev => ({ ...prev, donation: { ...prev.donation!, [k]: e.target.value } }))}
                            className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSaveBook} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm py-3 rounded-lg transition">
                {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save All Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'assets' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-xl mx-auto space-y-6">
              <h2 className="font-[Space_Grotesk] text-lg font-bold">Assets & Files</h2>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <label className="text-[10px] uppercase tracking-wider text-amber-400 block mb-3">📚 Book Cover Image</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {editBook.coverImage && <img src={editBook.coverImage} alt="Cover" className="w-20 h-28 object-cover rounded border border-slate-700" />}
                  <label className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs cursor-pointer transition">
                    {coverBusy ? 'Optimizing…' : 'Upload Cover'}
                    <input type="file" accept="image/*" onChange={handleBookCover} className="hidden" />
                  </label>
                  {editBook.coverImage && <button onClick={() => setEditBook(prev => ({ ...prev, coverImage: undefined }))} className="text-red-400 text-xs hover:underline">Remove</button>}
                </div>
                {coverMsg && <p className="text-[11px] text-emerald-400 mt-2">{coverMsg}</p>}
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">…or paste an image link (recommended for all browsers)</label>
                  <input
                    type="url"
                    placeholder="https://…/cover.jpg"
                    value={editBook.coverImage && /^https?:\/\//i.test(editBook.coverImage) ? editBook.coverImage : ''}
                    onChange={e => setEditBook(prev => ({ ...prev, coverImage: e.target.value.trim() || undefined }))}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Uploads are compressed and stored in Firebase Storage, so the cover remains available on every browser.</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                <label className="text-[10px] uppercase tracking-wider text-amber-400 block mb-3">📄 Book PDF File</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs cursor-pointer transition">
                    Upload PDF
                    <input type="file" accept=".pdf" onChange={handlePdf} className="hidden" />
                  </label>
                  {editBook.customPdf && !/^https?:\/\//i.test(editBook.customPdf) && <span className="text-xs text-emerald-400">✓ PDF file attached</span>}
                  {editBook.customPdf && <button onClick={() => setEditBook(prev => ({ ...prev, customPdf: undefined }))} className="text-red-400 text-xs hover:underline">Remove</button>}
                </div>
                {pdfMsg && <p className="text-[11px] text-amber-400 mt-2">{pdfMsg}</p>}
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">…or paste a PDF link (best for big books)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/… or https://yoursite.com/book.pdf"
                    value={editBook.customPdf && /^https?:\/\//i.test(editBook.customPdf) ? editBook.customPdf : ''}
                    onChange={e => setEditBook(prev => ({ ...prev, customPdf: e.target.value.trim() || undefined }))}
                    className="w-full bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">PDFs up to 25MB upload to Firebase Storage. You can also paste a permanent hosted PDF link.</p>
                </div>
                {book.type === 'free' && <p className="text-[10px] text-slate-500 mt-2">Visitors download/open this file immediately on form submission.</p>}
                {book.type === 'paid' && <p className="text-[10px] text-slate-500 mt-2">You manually send this to leads after payment confirmation.</p>}
              </div>

              <button onClick={handleSaveBook} disabled={saving} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm py-3 rounded-lg transition">
                {saved ? '✓ Saved!' : 'Save Asset Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

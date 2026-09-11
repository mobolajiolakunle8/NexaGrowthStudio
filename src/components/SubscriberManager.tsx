import { useEffect, useState } from 'react';
import type { Book, SiteSettings, Subscriber } from '../types';
import { deleteSubscriber, startSubscriberSync, unsubscribeSubscriber } from '../cloud';
import { sendWeb3Form, newReleaseTemplate } from '../email';

interface Props {
  settings: SiteSettings;
  books: Book[];
}

export default function SubscriberManager({ settings, books }: Props) {
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<'idle' | 'sending' | 'exporting'>('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [broadcastBookId, setBroadcastBookId] = useState<string>('');

  useEffect(() => {
    const stop = startSubscriberSync(setSubs);
    return stop;
  }, []);

  const active = subs.filter(s => s.status !== 'unsubscribed');
  const inactive = subs.filter(s => s.status === 'unsubscribed');

  const filtered = (subs || []).filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const copyEmails = async () => {
    const list = active.map(s => s.email).join(', ');
    if (!list) {
      setStatusMsg('No active subscribers yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(list);
      setStatusMsg(`Copied ${active.length} email${active.length === 1 ? '' : 's'}.`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch {
      setStatusMsg('Could not copy to clipboard.');
    }
  };

  const broadcast = async () => {
    const book = books.find(b => b.id === broadcastBookId) || books[0];
    if (!book) {
      setStatusMsg('No book available to announce.');
      return;
    }
    if (!active.length) {
      setStatusMsg('No active subscribers to email.');
      return;
    }
    if (!confirm(`Email ${active.length} subscriber${active.length === 1 ? '' : 's'} about "${book.title}"?`)) return;
    setBusy('sending');
    setStatusMsg(null);
    let sent = 0;
    for (const sub of active) {
      try {
        const res = await sendWeb3Form(newReleaseTemplate(book, sub.email, settings));
        if (res.ok) sent += 1;
      } catch { /* continue */ }
    }
    setBusy('idle');
    setStatusMsg(`Release announcements sent: ${sent}/${active.length}.`);
  };

  const exportCsv = () => {
    setBusy('exporting');
    try {
      const rows = subs.map(s => [s.email, s.status, new Date(s.date).toLocaleString()]);
      const csv = ['Email,Status,Date', ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexa-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMsg('Subscriber list downloaded.');
    } finally {
      setBusy('idle');
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C8862A] text-white';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white">Subscriber List</h2>
        <p className="text-xs text-slate-400 mt-1">
          Everyone who taps <strong>Subscribe</strong> on the homepage. New book releases email them automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Active</span>
          <span className="text-2xl font-bold text-emerald-400 font-[Space_Grotesk] mt-1 block">{active.length}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Unsubscribed</span>
          <span className="text-2xl font-bold text-slate-300 font-[Space_Grotesk] mt-1 block">{inactive.length}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Total</span>
          <span className="text-2xl font-bold text-white font-[Space_Grotesk] mt-1 block">{subs.length}</span>
        </div>
      </div>

      {/* Broadcast panel */}
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Announce book to all subscribers</label>
            <select
              value={broadcastBookId || books[0]?.id || ''}
              onChange={e => setBroadcastBookId(e.target.value)}
              className={inputCls}
            >
              {books.map(b => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => void broadcast()}
            disabled={busy === 'sending' || !active.length}
            className="bg-[#C8862A] hover:bg-[#d8963a] disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl transition shrink-0"
          >
            {busy === 'sending' ? 'Sending…' : `Email ${active.length} subscriber${active.length === 1 ? '' : 's'}`}
          </button>
        </div>
        {statusMsg && <p className="text-xs text-emerald-400 font-mono">{statusMsg}</p>}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search subscribers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#C8862A] text-white w-full max-w-xs"
        />
        <button onClick={() => void copyEmails()} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-700 transition">📋 Copy emails</button>
        <button onClick={exportCsv} disabled={busy === 'exporting'} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-700 transition disabled:opacity-50">📥 Export CSV</button>
        <span className="text-xs text-slate-400 font-mono">{filtered.length} shown</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
          <span className="text-4xl mb-3">✉️</span>
          <h3 className="font-[Space_Grotesk] font-bold text-lg mb-1">No subscribers yet</h3>
          <p className="text-sm text-slate-400 max-w-sm">Visitors who tap Subscribe on the homepage will appear here in real time.</p>
        </div>
      ) : (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
                  <th className="p-4">Email</th>
                  <th className="p-4">Subscribed</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-900/60">
                    <td className="p-4 font-mono text-white">{sub.email}</td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">{new Date(sub.date).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sub.status === 'unsubscribed'
                          ? 'bg-slate-700/30 text-slate-400 border border-slate-700'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {sub.status === 'unsubscribed' ? 'Unsubscribed' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {sub.status !== 'unsubscribed' ? (
                        <button
                          onClick={() => void unsubscribeSubscriber(sub.id)}
                          className="text-[11px] text-slate-400 hover:text-amber-400 underline mr-3"
                        >
                          Unsubscribe
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${sub.email}?`)) void deleteSubscriber(sub.id);
                        }}
                        className="text-[11px] text-red-400 hover:text-red-300 underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

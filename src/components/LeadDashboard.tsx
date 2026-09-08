import { useMemo, useState, useRef, useEffect } from 'react';
import type { Lead } from '../types';

interface Props {
  leads: Lead[];
}

export default function LeadDashboard({ leads }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'duplicates' | 'analytics'>('overview');
  const [viewChartDays, setViewChartDays] = useState<7 | 30>(7);
  const notifiedRef = useRef(new Set<string>());

  useEffect(() => {
    const now = Date.now();
    leads.forEach(lead => {
      if (notifiedRef.current.has(lead.id)) return;
      const leadDate = new Date(lead.date).getTime();
      // Notify for leads from the last ~2 mins while admin is idle
      if (now - leadDate < 2 * 60 * 1000) {
        notifiedRef.current.add(lead.id);
        window.open(
          `https://wa.me/+2349030192034?text=${encodeURIComponent(
            `📚 NEW ORDER — Nexa Customer\nBook: ${lead.bookId}\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nStatus: ${lead.status}${lead.paid !== undefined ? `\nPaid: ${lead.paid ? 'Yes' : 'No'}` : ''}\nTime: ${lead.date}`
          )}`,
          '_blank', 'noopener,noreferrer'
        );
      }
    });
  }, [leads]);

  const today = new Date().toDateString();
  const leadsToday = leads.filter(l => new Date(l.date).toDateString() === today).length;
  const paidLeads = leads.filter(l => l.paid === true).length;
  const pendingPaid = leads.filter(l => l.paid === false).length;

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dups = new Set<string>();
    leads.forEach(lead => {
      const key = `${lead.email.toLowerCase()}-${lead.phone.replace(/\D/g,'')}`;
      if (seen.has(key)) dups.add(key);
      seen.add(key);
    });
    return dups;
  }, [leads]);

  const analytics = useMemo(() => {
    const days = [];
    for (let i = viewChartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days.map(day => {
      const count = leads.filter(l => {
        const d = new Date(l.date);
        return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
      }).length;
      const paid = leads.filter(l => {
        const d = new Date(l.date);
        return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate() && l.paid === true;
      }).length;
      return { day: day.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }), count, paid };
    });
  }, [leads, viewChartDays]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-1 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">Today</p>
          <p className="mt-1 font-[Space_Grotesk] text-2xl font-bold text-amber-400">{leadsToday}</p>
        </div>
        <div className="col-span-1 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">All Leads</p>
          <p className="mt-1 font-[Space_Grotesk] text-2xl font-bold text-white">{leads.length}</p>
        </div>
        <div className="col-span-1 bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400">Paid Orders</p>
          <p className="mt-1 font-[Space_Grotesk] text-2xl font-bold text-emerald-400">{paidLeads}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{leads.length - paidLeads} pending</p>
        </div>
        <div className={`col-span-1 bg-slate-950 border ${duplicates.size > 0 ? 'border-red-500/30' : 'border-slate-800'} rounded-2xl p-4`}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">{duplicates.size > 0 ? '⚠️ Duplicates' : 'Duplicates'}</p>
          <p className={`mt-1 font-[Space_Grotesk] text-2xl font-bold ${duplicates.size > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{duplicates.size}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{pendingPaid} unpaid orders</p>
        </div>
      </div>

      {/* Panel Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['overview', 'duplicates', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === tab ? 'bg-[#C8862A] text-[#0E1420]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {tab === 'overview' ? '📈 Analytics' : tab === 'duplicates' ? (duplicates.size > 0 ? `${duplicates.size} ⚠` : 'Duplicates') : '📉 Sales Graph'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-3">
          <h3 className="font-[Space_Grotesk] text-lg font-bold text-white">Recent Enquiries & Orders (Last 10)</h3>
          {leads.length === 0 ? (
            <p className="py-12 text-center text-slate-500">No entries yet.</p>
          ) : (
            <div className="space-y-2.5">
              {[...leads].slice(0, 10).map(lead => {
                const isDuplicate = duplicates.has(`${lead.email.toLowerCase()}-${lead.phone.replace(/\D/g,'')}`);
                return (
                  <div key={lead.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-4 py-3 transition-all hover:border-[#C8862A]/40 ${
                    isDuplicate ? 'border-red-500/30 bg-red-500/5' : 'border-slate-800 bg-slate-900/30'
                  }`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-white text-sm">{lead.name}</span>
                        {isDuplicate && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-bold text-red-300">DUPLICATE</span>}
                      </div>
                      <div className="mt-1 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-0.5 font-mono">
                        <span>{lead.email}</span>
                        <span>{lead.phone}</span>
                        <span className="text-slate-500">{new Date(lead.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        lead.status === 'New' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        lead.status === 'Contacted' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                        lead.status === 'Qualified' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                      }`}>{lead.status}</span>
                      {lead.paid !== undefined && (
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">PAID</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Duplicates Tab */}
      {activeTab === 'duplicates' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <h3 className="font-[Space_Grotesk] text-lg font-bold text-white mb-3">Duplicate Enquiries Detected</h3>
          {duplicates.size === 0 ? (
            <p className="py-8 text-center text-emerald-400 text-sm">✓ No repeated customers in the lead history.</p>
          ) : (
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
              <p className="text-sm text-red-300 mb-3">
                {duplicates.size} email address{duplicates.size === 1 ? '' : 'es'} appears more than once.
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-400 font-mono">
                {[...duplicates].map(key => (
                  <li key={key}>{key.replace('-', ' · ')}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Analytics Chart */}
      {activeTab === 'analytics' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-[Space_Grotesk] text-lg font-bold text-white">Order Volume Trend</h3>
            <div className="flex gap-1 rounded-xl border border-slate-700 p-1">
              {[7, 30].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setViewChartDays(days as 7 | 30)}
                  className={`rounded-lg px-3 py-1 text-[10px] font-bold transition ${
                    viewChartDays === days ? 'bg-[#C8862A] text-[#0E1420]' : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-[#131824] p-4">
            <div className="flex h-48 items-end gap-0.5 overflow-x-auto pb-2">
              {analytics.map((day, i) => (
                <div key={i} className="flex-1 shrink-0 min-w-[34px] flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end h-38 relative">
                    <div
                      className="w-full rounded-t-sm bg-[#C8862A] hover:opacity-85 transition-all"
                      style={{ height: `${Math.min(day.count * 14, 100)}px` }}
                      title={`${day.day}: ${day.count} total`}
                    ></div>
                    {day.paid > 0 && (
                      <div
                        className="absolute left-1/2 bottom-0 -translate-x-1/2 w-full rounded-t-sm bg-emerald-500 hover:opacity-85"
                        style={{ height: `${Math.min(day.paid * 14, 100)}px` }}
                        title={`${day.day}: ${day.paid} paid`}
                      ></div>
                    )}
                  </div>
                  <span className="text-[7.5px] text-slate-500 font-mono text-center max-w-[40px] truncate">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#C8862A]" /> Enquiries</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Paid Orders</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

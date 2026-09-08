import { useEffect, useState } from 'react';
import type { SiteSettings } from '../types';

interface Props {
  settings: SiteSettings;
  superPasscode: string;
  onSettingsChange: (settings: SiteSettings) => Promise<void>;
  onExit: () => void;
}

const inputCls =
  'w-full bg-white/5 border border-white/15 px-3.5 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-[#C8862A] transition-colors';

function Toggle({
  label,
  description,
  value,
  onChange,
  accent,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  accent: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="min-w-0">
        <p className="font-[Space_Grotesk] text-sm font-bold text-white">{label}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="relative h-7 w-14 shrink-0 rounded-full transition-colors cursor-pointer"
        style={{ background: value ? accent : 'rgba(255,255,255,0.15)' }}
        aria-pressed={value}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
          style={{ left: value ? '2rem' : '0.25rem' }}
        />
      </button>
    </div>
  );
}

export default function SuperAdmin({ settings, superPasscode, onSettingsChange, onExit }: Props) {
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const [draft, setDraft] = useState<SiteSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === superPasscode) {
      setAuthed(true);
      setError('');
      setCode('');
    } else {
      setError('Incorrect developer passcode.');
    }
  };

  const publish = async (next: SiteSettings, message: string) => {
    setDraft(next);
    setSaving(true);
    setSavedMsg(null);
    try {
      await onSettingsChange(next);
      setSavedMsg(`✓ ${message}`);
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (err) {
      setSavedMsg(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const preview = () => {
    sessionStorage.setItem('nexa_dev_preview', '1');
    window.location.hash = '';
  };
  const exitPreview = () => {
    sessionStorage.removeItem('nexa_dev_preview');
    window.location.hash = '';
  };

  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center px-6 font-[Inter]" style={{ background: '#0E1420' }}>
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex items-center gap-2.5 mb-1">
            <span className="grid h-9 w-9 place-items-center rounded-xl font-[Space_Grotesk] text-sm font-black" style={{ background: '#C8862A', color: '#0E1420' }}>
              N
            </span>
            <h2 className="font-[Space_Grotesk] text-lg font-bold text-white">Developer Authorization</h2>
          </div>
          <p className="mt-1 mb-5 text-xs leading-relaxed text-white/55">
            This console controls the website's live status and the link to your external books website. Restricted to the publisher.
          </p>

          <form onSubmit={handleAuth} className="flex flex-col gap-3">
            <input
              required
              type="password"
              placeholder="Enter developer passcode"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center font-mono text-sm tracking-widest text-white focus:border-[#C8862A] focus:outline-none"
              autoFocus
            />
            {error && <p className="text-center text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              className="rounded-full bg-[#C8862A] py-3 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E1420] transition-transform hover:scale-[1.02]"
            >
              Authorize Access
            </button>
          </form>

          <button onClick={onExit} className="mt-5 w-full text-center font-[JetBrains_Mono] text-[10px] uppercase tracking-wider text-white/40 hover:text-white/70">
            ← Back to website
          </button>
        </div>
      </div>
    );
  }

  const siteActive = draft.siteActive !== false;
  const siteDev = draft.siteDeveloper === true;

  return (
    <div className="min-h-screen font-[Inter]" style={{ background: '#0E1420' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0E1420]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl font-[Space_Grotesk] text-base font-black" style={{ background: '#C8862A', color: '#0E1420' }}>
              N
            </span>
            <div>
              <h1 className="font-[Space_Grotesk] text-base font-bold text-white">Developer Console</h1>
              <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.2em] text-white/45">Authorized publisher access</p>
            </div>
          </div>
          <a
            href="#/"
            className="rounded-full border border-white/15 px-3.5 py-1.5 font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 no-underline hover:bg-white/5"
          >
            Website
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        {savedMsg && (
          <div
            className={`rounded-xl border p-3.5 text-xs font-semibold ${
              savedMsg.startsWith('✓')
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
            }`}
          >
            {savedMsg}
          </div>
        )}

        {/* Site status */}
        <section className="rounded-2xl border border-[#C8862A]/25 bg-[#C8862A]/[0.06] p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-[Space_Grotesk] text-base font-bold text-white">🌐 Website Status</h2>
            <span
              className="rounded-full px-2.5 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em]"
              style={
                !siteActive
                  ? { background: 'rgba(168,69,47,0.2)', color: '#E0876F' }
                  : siteDev
                    ? { background: 'rgba(200,134,42,0.2)', color: '#E0B27A' }
                    : { background: 'rgba(79,107,82,0.2)', color: '#8FBF94' }
              }
            >
              {!siteActive ? 'Deactivated' : siteDev ? 'Developer Mode' : 'Live'}
            </span>
          </div>

          <Toggle
            label="Website is live"
            description="Visitors can browse the website. Turning this off shows a maintenance screen."
            value={siteActive}
            onChange={next => publish({ ...draft, siteActive: next }, next ? 'Website activated.' : 'Website deactivated.')}
            accent="#4F6B52"
          />
          <Toggle
            label="Developer mode"
            description="Shows a maintenance screen to the public while you work on updates."
            value={siteDev}
            onChange={next => publish({ ...draft, siteDeveloper: next }, next ? 'Website placed in developer mode.' : 'Website published.')}
            accent="#C8862A"
          />
        </section>

        {/* External general books website */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3.5">
          <div>
            <h2 className="font-[Space_Grotesk] text-base font-bold text-white">📚 General Books Website</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/55">
              Link a separate website for fiction, memoirs and other non-business books. A button on this site redirects visitors there.
            </p>
          </div>
          <div>
            <label className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wider text-white/50 block mb-1">Website URL</label>
            <input
              type="url"
              value={draft.generalBooksUrl || ''}
              onChange={e => setDraft(p => ({ ...p, generalBooksUrl: e.target.value }))}
              placeholder="https://your-other-website.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="font-[JetBrains_Mono] text-[10px] uppercase tracking-wider text-white/50 block mb-1">Button label</label>
            <input
              type="text"
              value={draft.generalBooksLabel || 'General Books'}
              onChange={e => setDraft(p => ({ ...p, generalBooksLabel: e.target.value }))}
              className={inputCls}
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => publish(draft, 'General Books website link updated.')}
            className="rounded-full bg-[#C8862A] px-5 py-2.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E1420] transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save link'}
          </button>
        </section>

        {/* Maintenance notice */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <h2 className="font-[Space_Grotesk] text-base font-bold text-white">🛠️ Maintenance Notice</h2>
          <p className="text-[11.5px] leading-relaxed text-white/55">
            This message is shown to visitors whenever the website is in developer mode.
          </p>
          <textarea
            rows={3}
            value={draft.developerNotice || ''}
            onChange={e => setDraft(p => ({ ...p, developerNotice: e.target.value }))}
            className={inputCls}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => publish(draft, 'Maintenance notice updated.')}
            className="rounded-full bg-[#C8862A] px-5 py-2.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E1420] transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save notice'}
          </button>
        </section>

        {/* Preview links */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
          <h2 className="font-[Space_Grotesk] text-base font-bold text-white">👀 Preview (authorized)</h2>
          <p className="text-[11.5px] leading-relaxed text-white/55">
            Review the website even while the public sees a maintenance screen.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={preview}
              className="rounded-full bg-[#C8862A] px-5 py-2.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#0E1420] no-underline"
            >
              Preview website
            </button>
            <button
              onClick={exitPreview}
              className="rounded-full border border-white/15 px-5 py-2.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/75 hover:bg-white/5"
            >
              Exit preview
            </button>
            <a
              href="#/admin"
              className="rounded-full border border-white/15 px-5 py-2.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/75 no-underline hover:bg-white/5"
            >
              Open Admin
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

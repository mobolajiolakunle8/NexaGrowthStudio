import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Link2, MessageCircle, Tag } from 'lucide-react';
import type { Article, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';

interface Props {
  article: Article;
  articles: Article[];
  settings: SiteSettings;
}

const THEME_KEY = 'nexa_public_theme';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

export default function ArticleView({ article, articles, settings }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* ignore */ }
    return settings.defaultTheme || 'light';
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [article.id]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved !== 'light' && saved !== 'dark') setTheme(settings.defaultTheme || 'light');
    } catch { /* ignore */ }
  }, [settings.defaultTheme]);

  const dark = theme === 'dark';
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/article/${article.slug}`;
  const shareText = `${article.title} — via ${settings.studioName}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const related = articles
    .filter(a => a.id !== article.id && a.published !== false)
    .sort((a, b) => {
      const aScore = (a.category === article.category ? 2 : 0) + (a.tags || []).filter(t => (article.tags || []).includes(t)).length;
      const bScore = (b.category === article.category ? 2 : 0) + (b.tags || []).filter(t => (article.tags || []).includes(t)).length;
      return bScore - aScore;
    })
    .slice(0, 3);

  // Weave supporting images through the body
  const gallery = article.images || [];
  const midIndex = Math.max(1, Math.floor(article.body.length / 2));

  const darkCls = dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]';
  const mutedCls = dark ? 'text-white/60' : 'text-[#0E1420]/68';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${darkCls}`}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? 'border-white/10 bg-[#090D15]/92' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/articles" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} size="sm" />
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block truncate font-[Space_Grotesk] text-[13px] font-bold">{settings.studioName}</span>
              <span className={`block font-[JetBrains_Mono] text-[8px] uppercase tracking-[0.2em] ${mutedCls}`}>Articles &amp; Insights</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <a href="#/articles" className="inline-flex items-center gap-1.5 rounded-full border border-[#C8862A]/40 px-3.5 py-1.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A] no-underline transition-colors hover:bg-[#C8862A] hover:text-[#0E1420]">
              <ArrowLeft size={12} /> All stories
            </a>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-8 pt-10 md:pt-14">
        <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.24em] text-[#C8862A]">
          {article.category || 'Insights'}
        </p>
        <h1 className="mt-4 font-[Space_Grotesk] text-[32px] font-bold leading-[1.08] tracking-[-0.025em] md:text-[48px]">
          {article.title}
        </h1>
        <p className={`mt-4 max-w-2xl text-[15.5px] leading-[1.7] md:text-[17px] ${mutedCls}`}>
          {article.excerpt}
        </p>

        <div className={`mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-4 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] text-[11px] font-black text-[#C8862A]">
              {article.author.split(' ').map(p => p[0]).slice(0, 2).join('')}
            </span>
            <span className="text-[13px] font-semibold">{article.author}</span>
          </span>
          <span className={`flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.12em] ${mutedCls}`}>
            <CalendarDays size={12} /> {formatDate(article.updatedAt || article.createdAt)}
          </span>
          <span className={`flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.12em] ${mutedCls}`}>
            <Clock3 size={12} /> {article.readMinutes || 3} min read
          </span>
        </div>

        {article.coverImage && (
          <figure className="mt-8 overflow-hidden rounded-3xl shadow-2xl">
            <img src={article.coverImage} alt={article.title} className="aspect-[16/9] w-full object-cover" />
          </figure>
        )}

        <div className="mt-8 space-y-6">
          {article.body.map((para, i) => (
            <div key={i}>
              {i === 0 ? (
                <p className="text-[17px] font-medium leading-[1.8] first-letter:float-left first-letter:mr-3 first-letter:font-[Space_Grotesk] first-letter:text-[56px] first-letter:font-bold first-letter:leading-[0.9] first-letter:text-[#C8862A]">
                  {para}
                </p>
              ) : (
                <p className={`text-[15.5px] leading-[1.85] ${dark ? 'text-white/75' : 'text-[#0E1420]/80'}`}>{para}</p>
              )}
              {i === midIndex - 1 && gallery.length > 0 && (
                <figure className="mt-8 overflow-hidden rounded-2xl shadow-lg">
                  <img src={gallery[0]} alt="" className="aspect-[16/9] w-full object-cover" />
                </figure>
              )}
            </div>
          ))}
          {gallery.slice(1).map((src, i) => (
            <figure key={i} className="overflow-hidden rounded-2xl shadow-lg">
              <img src={src} alt="" className="aspect-[16/9] w-full object-cover" />
            </figure>
          ))}
        </div>

        {(article.tags || []).length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-2">
            <Tag size={13} className="text-[#C8862A]" />
            {article.tags.map(t => (
              <span key={t} className={`rounded-full px-3 py-1.5 font-[JetBrains_Mono] text-[9px] font-semibold uppercase tracking-[0.12em] ${dark ? 'bg-white/8 text-white/65' : 'bg-[#0E1420] text-white'}`}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Share */}
        <div className={`mt-10 flex flex-wrap items-center gap-3 rounded-3xl border p-5 ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white'}`}>
          <span className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.16em] text-[#C8862A]">Share this story</span>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-white no-underline"
          >
            <MessageCircle size={12} /> WhatsApp
          </a>
          <button onClick={copyLink} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${dark ? 'border-white/15 text-white/75 hover:bg-white/10' : 'border-[#0E1420]/15 text-[#0E1420]/75 hover:bg-[#0E1420]/5'}`}>
            <Link2 size={12} /> {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Subscribe for more */}
        <div className="mt-8 overflow-hidden rounded-3xl bg-[#0E1420] px-7 py-10 text-center text-white shadow-2xl">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8862A]">Never miss a story</p>
          <h3 className="mx-auto mt-3 max-w-md font-[Space_Grotesk] text-[22px] font-bold leading-snug">
            Subscribe for more articles like this
          </h3>
          <div className="mx-auto mt-2 max-w-md [&_form]:mt-6">
            <SubscribeFormInline />
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-14">
            <h3 className="font-[Space_Grotesk] text-xl font-bold">Related stories</h3>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {related.map(r => (
                <a key={r.id} href={`#/article/${r.slug}`} className={`group flex flex-col overflow-hidden rounded-2xl border no-underline transition-all hover:-translate-y-1 hover:shadow-xl ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white'}`}>
                  <div className="h-32 overflow-hidden">
                    {r.coverImage ? (
                      <img src={r.coverImage} alt={r.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[#0E1420]">
                        <span className="font-[Space_Grotesk] text-2xl font-black text-[#C8862A]">N</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#C8862A]">{r.category || 'Insights'}</p>
                    <p className="mt-1.5 line-clamp-2 font-[Space_Grotesk] text-[14px] font-bold leading-snug">{r.title}</p>
                    <p className={`mt-auto pt-3 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>
                      {r.readMinutes || 3} min read
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </article>

      <Footer settings={settings} dark={dark} />
    </div>
  );
}

function SubscribeFormInline() {
  const [email, setEmail] = Component_state_email();
  return <SubscribeFormInner email={email} setEmail={setEmail} />;
}

// Local lightweight subscribe to avoid circular heavy imports
import { useState as _useState } from 'react';
function Component_state_email(): [string, (v: string) => void] {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return _useState('');
}

function SubscribeFormInner({ email, setEmail }: { email: string; setEmail: (v: string) => void }) {
  const [status, setStatus] = _useState<'idle' | 'sending' | 'sent' | 'invalid' | 'failed'>('idle');
  const isValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!isValid(clean)) { setStatus('invalid'); return; }
    setStatus('sending');
    try {
      const { addSubscriberInCloud } = await import('../cloud');
      await addSubscriberInCloud({
        id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        email: clean,
        date: new Date().toISOString(),
        status: 'active',
      });
      setStatus('sent');
      setEmail('');
    } catch { setStatus('failed'); }
  };

  if (status === 'sent') {
    return (
      <div className="relative mt-6 mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-center">
        <p className="font-[Space_Grotesk] text-[16px] font-bold text-emerald-300">You're subscribed! 🎉</p>
        <p className="mt-1 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-white/55">
          New stories will land in your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative mx-auto mt-6 max-w-md" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'sending'}
          className="w-full flex-1 rounded-full border border-white/20 bg-white/5 px-5 py-3.5 font-mono text-[12.5px] text-white focus:border-[#C8862A] focus:outline-none placeholder:text-white/35 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="shrink-0 rounded-full bg-[#C8862A] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {status === 'sending' ? 'Subscribing…' : 'Subscribe for more'}
        </button>
      </div>
      {status === 'invalid' && <p className="mt-3 text-xs text-red-400">Please enter a valid email address.</p>}
      {status === 'failed' && <p className="mt-3 text-xs text-red-400">Something went wrong. Please try again.</p>}
    </form>
  );
}

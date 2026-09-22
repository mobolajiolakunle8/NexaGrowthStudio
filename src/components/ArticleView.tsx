import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  MessageCircle,
  Send,
} from 'lucide-react';
import type { Article, ArticleComment, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import { readTimeOf, formatDate } from './ArticlesHome';
import {
  addArticleComment,
  addArticleReply,
  toggleArticleLike,
  toggleCommentLike,
} from '../cloud';
import { generateId } from '../storage';

interface Props {
  article: Article;
  articles: Article[];
  settings: SiteSettings;
}

const THEME_KEY = 'nexa_public_theme';
const VISITOR_KEY = 'nexa_visitor_id';

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export default function ArticleView({ article, articles, settings }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* ignore */ }
    return settings.defaultTheme || 'light';
  });

  const [liking, setLiking] = useState(false);
  const [commentLikesBusy, setCommentLikesBusy] = useState<string | null>(null);
  const [commentName, setCommentName] = useState('');
  const [commentMsg, setCommentMsg] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyName, setReplyName] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [article.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved !== 'light' && saved !== 'dark') setTheme(settings.defaultTheme || 'light');
    } catch { /* ignore */ }
  }, [settings.defaultTheme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

  const dark = theme === 'dark';
  const visitorId = useMemo(() => getVisitorId(), []);
  const liked = article.likes.includes(visitorId);

  const paragraphs = useMemo(
    () => article.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    [article.body]
  );

  const related = useMemo(
    () => articles
      .filter(a => a.published !== false && a.id !== article.id && a.category === article.category)
      .concat(articles.filter(a => a.published !== false && a.id !== article.id && a.category !== article.category))
      .slice(0, 3),
    [articles, article.id, article.category]
  );

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try { await toggleArticleLike(article.id, visitorId); }
    catch { /* live sync will correct */ }
    finally { setTimeout(() => setLiking(false), 400); }
  };

  const handleCommentLike = async (commentId: string) => {
    if (commentLikesBusy) return;
    setCommentLikesBusy(commentId);
    try { await toggleCommentLike(article.id, commentId, visitorId); }
    catch { /* ignore */ }
    finally { setTimeout(() => setCommentLikesBusy(null), 400); }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = commentName.trim();
    const message = commentMsg.trim();
    if (name.length < 2) { setCommentError('Please add your name (2+ characters).'); return; }
    if (message.length < 2) { setCommentError('Please write a comment first.'); return; }
    setCommentError('');
    setCommentSending(true);
    try {
      const comment: ArticleComment = {
        id: generateId(),
        name,
        message: message.slice(0, 1000),
        date: new Date().toISOString(),
        likes: [],
        replies: [],
      };
      await addArticleComment(article.id, comment);
      setCommentName('');
      setCommentMsg('');
    } catch {
      setCommentError('Could not post your comment. Please try again.');
    } finally {
      setCommentSending(false);
    }
  };

  const submitReply = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    const name = replyName.trim();
    const message = replyMsg.trim();
    if (name.length < 2 || message.length < 2) return;
    setReplySending(true);
    try {
      await addArticleReply(article.id, commentId, {
        id: generateId(),
        name,
        message: message.slice(0, 1000),
        date: new Date().toISOString(),
      });
      setReplyName('');
      setReplyMsg('');
      setReplyOpen(null);
    } catch { /* ignore — live sync corrects */ }
    finally { setReplySending(false); }
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#/article/${article.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMsg('Link copied!');
    } catch {
      setShareMsg(shareUrl);
    }
    setTimeout(() => setShareMsg(''), 2500);
  };

  const waShare = `https://wa.me/?text=${encodeURIComponent(`📰 ${article.title}\n\n${article.excerpt}\n\nRead here: ${shareUrl}`)}`;

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]'}`}>
      {/* ── Masthead ── */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${dark ? 'border-white/10 bg-[#090D15]/90' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="#/articles"
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors ${dark ? 'border-white/15 text-white/70 hover:border-[#C8862A]' : 'border-[#0E1420]/15 text-[#0E1420]/70 hover:border-[#C8862A]'}`}
              title="Back to all stories"
            >
              <ArrowLeft size={16} />
            </a>
            <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
              <BrandLogo settings={settings} dark={dark} />
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block truncate font-[Space_Grotesk] text-[15px] font-bold">{settings.studioName}</span>
                <span className={`block truncate font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.2em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>Newsroom</span>
              </span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <a
              href="#/articles"
              className="hidden rounded-full bg-[#C8862A] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] text-[#0E1420] no-underline sm:inline-flex"
            >
              All stories
            </a>
          </div>
        </div>
      </header>

      {/* ── Reader hero ── */}
      <article className="mx-auto max-w-3xl px-5 pt-10 md:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#C8862A] px-3 py-1 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#0E1420]">
            {article.category}
          </span>
          {(article.tags || []).slice(0, 3).map(t => (
            <span key={t} className={`rounded-full px-3 py-1 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${dark ? 'bg-white/8 text-white/60' : 'bg-[#0E1420]/5 text-[#0E1420]/60'}`}>
              {t}
            </span>
          ))}
        </div>

        <h1 className="mt-5 font-[Space_Grotesk] text-[32px] font-bold leading-[1.08] tracking-[-0.028em] md:text-[48px]">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className={`mt-4 text-[16px] leading-[1.7] md:text-[17.5px] ${dark ? 'text-white/60' : 'text-[#0E1420]/70'}`}>
            {article.excerpt}
          </p>
        )}

        <div className={`mt-6 flex flex-wrap items-center justify-between gap-4 border-y py-4 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.12em] ${dark ? 'border-white/10 text-white/40' : 'border-[#0E1420]/10 text-[#0E1420]/45'}`}>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] text-[13px] font-black text-[#C8862A]">
              {settings.founderName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'N'}
            </span>
            <span>
              <span className={`block font-bold normal-case tracking-normal ${dark ? 'text-white/80' : 'text-[#0E1420]/80'}`}>{settings.founderName}</span>
              <span>{formatDate(article.createdAt)} · {readTimeOf(article.body)} min read</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => void handleLike()}
              disabled={liking}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-bold transition-all active:scale-95 ${
                liked
                  ? 'border-[#C8862A] bg-[#C8862A]/15 text-[#C8862A]'
                  : dark
                    ? 'border-white/15 text-white/60 hover:border-[#C8862A]/60'
                    : 'border-[#0E1420]/15 text-[#0E1420]/60 hover:border-[#C8862A]'
              }`}
              title={liked ? 'Unlike this story' : 'Like this story'}
            >
              <Heart size={13} className={liked ? 'fill-[#C8862A] text-[#C8862A]' : ''} />
              {article.likes.length}
            </button>
            <a
              href={waShare}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#0E1420] no-underline transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle size={13} /> Share
            </a>
            <button
              onClick={() => void copyLink()}
              className={`rounded-full border px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${dark ? 'border-white/15 text-white/60 hover:border-[#C8862A]' : 'border-[#0E1420]/15 text-[#0E1420]/60 hover:border-[#C8862A]'}`}
              title="Copy article link"
            >
              {shareMsg || 'Copy link'}
            </button>
          </div>
        </div>
      </article>

      {/* ── Cover image ── */}
      {article.coverImage && (
        <div className="mx-auto mt-8 max-w-4xl px-5">
          <img
            src={article.coverImage}
            alt={article.title}
            className="max-h-[480px] w-full rounded-3xl border border-black/10 object-cover shadow-xl"
          />
        </div>
      )}

      {/* ── Body ── */}
      <article className="mx-auto max-w-3xl px-5 py-10">
        <div className="space-y-5">
          {paragraphs.length ? paragraphs.map((p, i) => (
            <p key={i} className={`text-[16px] leading-[1.85] ${i === 0 ? 'font-medium first-letter:float-left first-letter:mr-2 first-letter:font-[Space_Grotesk] first-letter:text-[52px] first-letter:font-bold first-letter:leading-[0.9] first-letter:text-[#C8862A]' : ''} ${dark ? 'text-white/80' : 'text-[#0E1420]/85'}`}>
              {p}
            </p>
          )) : (
            <p className={`text-[15px] ${dark ? 'text-white/50' : 'text-[#0E1420]/55'}`}>Full story coming soon.</p>
          )}
        </div>

        {/* ── Inline gallery ── */}
        {(article.images || []).length > 0 && (
          <div className="mt-10">
            <p className={`mb-4 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.22em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>
              From this story · {(article.images || []).length}
            </p>
            <div className={`grid gap-4 ${(article.images || []).length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {(article.images || []).map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-black/10 shadow-md">
                  <img src={src} alt={`${article.title} — photo ${i + 1}`} loading="lazy" className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Tags ── */}
        {(article.tags || []).length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {(article.tags || []).map(t => (
              <span key={t} className={`rounded-full px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.12em] ${dark ? 'bg-white/8 text-white/60' : 'bg-[#0E1420]/5 text-[#0E1420]/60'}`}>
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* ── Author box ── */}
        <div className={`mt-10 flex items-center gap-4 rounded-3xl border p-6 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-white'}`}>
          {settings.founderPhoto ? (
            <img src={settings.founderPhoto} alt={settings.founderName} className="h-14 w-14 shrink-0 rounded-2xl border-2 border-[#C8862A] object-cover" />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0E1420] font-[Space_Grotesk] text-lg font-black text-[#C8862A]">
              {settings.founderName.split(' ').map(n => n[0]).slice(0, 2).join('') || 'N'}
            </span>
          )}
          <div>
            <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.16em] text-[#C8862A]">Written by</p>
            <p className="mt-0.5 font-[Space_Grotesk] text-[16px] font-bold">{settings.founderName}</p>
            <p className={`font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.12em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>{settings.founderRole}</p>
          </div>
        </div>
      </article>

      {/* ── Comments ── */}
      <section className={`border-t py-14 ${dark ? 'border-white/10 bg-[#090D15]' : 'border-[#0E1420]/10 bg-[#F2EBDD]/60'}`}>
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-[Space_Grotesk] text-[24px] font-bold tracking-[-0.02em]">
            Discussion <span className="text-[#C8862A]">({commentCount(article)})</span>
          </h2>

          {/* New comment form */}
          <form
            onSubmit={submitComment}
            className={`mt-6 rounded-3xl border p-5 md:p-6 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-white'}`}
          >
            <p className={`font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.18em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>
              Join the conversation
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
              <input
                value={commentName}
                onChange={e => setCommentName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-white/[0.04] text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-[#FAF7F2] placeholder:text-[#0E1420]/35'}`}
              />
              <div className="flex gap-2">
                <input
                  value={commentMsg}
                  onChange={e => setCommentMsg(e.target.value)}
                  placeholder="Share your thoughts…"
                  maxLength={1000}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-white/[0.04] text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-[#FAF7F2] placeholder:text-[#0E1420]/35'}`}
                />
                <button
                  type="submit"
                  disabled={commentSending}
                  className="grid h-[46px] w-[52px] shrink-0 place-items-center rounded-xl bg-[#C8862A] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  title="Post comment"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            {commentError && <p className="mt-3 text-xs text-red-400">{commentError}</p>}
          </form>

          {/* Comment threads */}
          <div className="mt-6 space-y-4">
            {(article.comments || []).length === 0 && (
              <p className={`rounded-2xl border border-dashed py-10 text-center text-sm ${dark ? 'border-white/15 text-white/40' : 'border-[#0E1420]/15 text-[#0E1420]/50'}`}>
                No comments yet — be the first to share your thoughts.
              </p>
            )}
            {(article.comments || []).map(c => {
              const cLiked = (c.likes || []).includes(visitorId);
              return (
                <div key={c.id} className={`rounded-3xl border p-5 md:p-6 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] text-sm font-black text-[#C8862A]">
                        {(c.name || '?').trim()[0]?.toUpperCase() || '?'}
                      </span>
                      <div>
                        <p className="font-[Space_Grotesk] text-[14px] font-bold">{c.name}</p>
                        <p className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
                          {formatDate(c.date)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleCommentLike(c.id)}
                      disabled={commentLikesBusy === c.id}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                        cLiked
                          ? 'border-[#C8862A] bg-[#C8862A]/15 text-[#C8862A]'
                          : dark
                            ? 'border-white/15 text-white/50 hover:border-[#C8862A]/60'
                            : 'border-[#0E1420]/15 text-[#0E1420]/50 hover:border-[#C8862A]'
                      }`}
                      title={cLiked ? 'Unlike' : 'Like this comment'}
                    >
                      ♥ {(c.likes || []).length}
                    </button>
                  </div>

                  <p className={`mt-3 text-[14px] leading-[1.7] ${dark ? 'text-white/75' : 'text-[#0E1420]/80'}`}>{c.message}</p>

                  {/* Replies */}
                  {(c.replies || []).length > 0 && (
                    <div className={`ml-5 mt-4 space-y-3 border-l-2 pl-4 ${dark ? 'border-[#C8862A]/30' : 'border-[#C8862A]/40'}`}>
                      {(c.replies || []).map(r => (
                        <div key={r.id}>
                          <p className="font-[Space_Grotesk] text-[13px] font-bold">
                            {r.name}
                            <span className={`ml-2 font-[JetBrains_Mono] text-[8.5px] font-normal uppercase tracking-[0.12em] ${dark ? 'text-white/30' : 'text-[#0E1420]/35'}`}>
                              {formatDate(r.date)}
                            </span>
                          </p>
                          <p className={`mt-1 text-[13.5px] leading-[1.65] ${dark ? 'text-white/65' : 'text-[#0E1420]/75'}`}>{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyOpen === c.id ? (
                    <form onSubmit={e => void submitReply(e, c.id)} className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={replyName}
                        onChange={e => setReplyName(e.target.value)}
                        placeholder="Your name"
                        maxLength={60}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none focus:border-[#C8862A] sm:max-w-[160px] ${dark ? 'border-white/15 bg-white/[0.04] text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-[#FAF7F2] placeholder:text-[#0E1420]/35'}`}
                      />
                      <div className="flex flex-1 gap-2">
                        <input
                          value={replyMsg}
                          onChange={e => setReplyMsg(e.target.value)}
                          placeholder="Write a reply…"
                          maxLength={1000}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] outline-none focus:border-[#C8862A] ${dark ? 'border-white/15 bg-white/[0.04] text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-[#FAF7F2] placeholder:text-[#0E1420]/35'}`}
                        />
                        <button
                          type="submit"
                          disabled={replySending}
                          className="shrink-0 rounded-xl bg-[#C8862A] px-4 py-2.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#0E1420] disabled:opacity-60"
                        >
                          {replySending ? '…' : 'Reply'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReplyOpen(null); setReplyName(''); setReplyMsg(''); }}
                          className={`shrink-0 rounded-xl border px-3 py-2.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.12em] ${dark ? 'border-white/15 text-white/50' : 'border-[#0E1420]/15 text-[#0E1420]/50'}`}
                        >
                          ✕
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => { setReplyOpen(c.id); setReplyName(''); setReplyMsg(''); }}
                      className="mt-3 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8862A] hover:underline"
                    >
                      ↩ Reply
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Related stories ── */}
      {related.length > 0 && (
        <section className={`border-t py-14 ${dark ? 'border-white/10 bg-[#090D15]' : 'border-[#0E1420]/10 bg-[#FAF7F2]'}`}>
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-[Space_Grotesk] text-[24px] font-bold tracking-[-0.02em] md:text-[30px]">Keep reading</h2>
              <a href="#/articles" className="inline-flex items-center gap-1 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8862A] no-underline hover:underline">
                All stories <ArrowRight size={12} />
              </a>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(a => (
                <a
                  key={a.id}
                  href={`#/article/${a.slug}`}
                  className={`group flex flex-col overflow-hidden rounded-3xl border no-underline transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-white'}`}
                >
                  <div className={`relative h-40 overflow-hidden ${dark ? 'bg-[#111824]' : 'bg-[#F2EBDD]'}`}>
                    {a.coverImage ? (
                      <img src={a.coverImage} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <div className="grid h-full place-items-center font-[Space_Grotesk] text-3xl font-black text-[#C8862A]/40">
                        {(a.title || 'N')[0]}
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-[#0E1420]/85 px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.14em] text-[#C8862A] backdrop-blur">
                      {a.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 font-[Space_Grotesk] text-[16px] font-bold leading-snug transition-colors group-hover:text-[#C8862A]">{a.title}</h3>
                    <p className={`mt-2 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
                      {formatDate(a.createdAt)} · ♥ {a.likes.length}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );

  function commentCount(a: Article): number {
    return (a.comments || []).reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
  }
}

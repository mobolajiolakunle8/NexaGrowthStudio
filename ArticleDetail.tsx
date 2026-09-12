import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CalendarDays, Clock3, Heart, MessageCircle, Send, Reply,
} from 'lucide-react';
import type { Article, ArticleComment, SiteSettings } from '../types';
import { ARTICLE_LIKES_KEY, ARTICLE_COMMENT_LIKES_KEY } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import {
  startArticleCommentsSync, createArticleComment,
  startArticleLikesSync, toggleArticleLike, toggleCommentLike,
} from '../cloud';
import { generateId } from '../storage';

interface Props {
  article: Article;
  related: Article[];
  settings: SiteSettings;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ' · ' +
      new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function getVoterId(): string {
  try {
    let id = localStorage.getItem('nexa_voter_id');
    if (!id) {
      id = `v_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('nexa_voter_id', id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

function readLikedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function writeLikedSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch { /* */ }
}

export default function ArticleDetail({ article, related, settings, theme, onToggleTheme }: Props) {
  const dark = theme === 'dark';
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [commentName, setCommentName] = useState('');
  const [commentMsg, setCommentMsg] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState('');

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyName, setReplyName] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  const [replySending, setReplySending] = useState(false);

  const [likedComments, setLikedComments] = useState<Set<string>>(() => readLikedSet(ARTICLE_COMMENT_LIKES_KEY));
  const [copied, setCopied] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState<string | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [article.id]);

  // Live comments + likes
  useEffect(() => {
    const stopComments = startArticleCommentsSync(article.id, setComments);
    const stopLikes = startArticleLikesSync(article.id, (state) => {
      setLikeCount(state.count);
      setLiked(!!state.voters[getVoterId()]);
    });
    return () => { stopComments(); stopLikes(); };
  }, [article.id]);

  const topLevel = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  const repliesOf = (id: string) => comments.filter(c => c.parentId === id);

  const paragraphs = useMemo(
    () => article.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    [article.body]
  );

  const articleUrl = `${window.location.origin}${window.location.pathname}#/article/${article.slug}`;

  const handleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const nowLiked = await toggleArticleLike(article.id, getVoterId());
      setLiked(nowLiked);
      const set = readLikedSet(ARTICLE_LIKES_KEY);
      if (nowLiked) set.add(article.id); else set.delete(article.id);
      writeLikedSet(ARTICLE_LIKES_KEY, set);
      setLikeCount(c => nowLiked ? c + 1 : Math.max(0, c - 1));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    const nowLiked = await toggleCommentLike(article.id, commentId, getVoterId());
    setLikedComments(prev => {
      const next = new Set(prev);
      if (nowLiked) next.add(commentId); else next.delete(commentId);
      writeLikedSet(ARTICLE_COMMENT_LIKES_KEY, next);
      return next;
    });
  };

  const submitComment = async (e: React.FormEvent, parentId: string | null, name: string, message: string, reset: () => void, setBusy: (b: boolean) => void) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2 || !message.trim() || message.trim().length < 2) {
      setCommentError('Please add your name and a message (at least 2 characters each).');
      return;
    }
    setCommentError('');
    setBusy(true);
    try {
      await createArticleComment({
        id: generateId(),
        articleId: article.id,
        parentId: parentId || null,
        name: name.trim().slice(0, 60),
        message: message.trim().slice(0, 2000),
        date: new Date().toISOString(),
        likes: 0,
      });
      reset();
      if (parentId) setReplyTo(null);
    } catch {
      setCommentError('Could not post your comment. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard unavailable */ }
  };

  const shareText = encodeURIComponent(`${article.title} — via ${settings.studioName}`);
  const shareUrl = encodeURIComponent(articleUrl);
  const muted = dark ? 'text-white/65' : 'text-[#0E1420]/70';
  const subtle = dark ? 'text-white/40' : 'text-[#0E1420]/45';

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-500 ${dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]'}`}>
      {/* Masthead */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? 'border-white/10 bg-[#090D15]/90' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} size="sm" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-[Space_Grotesk] text-[14px] font-bold">{settings.studioName}</span>
              <span className={`block truncate font-[JetBrains_Mono] text-[8px] uppercase tracking-[0.2em] ${subtle}`}>Newsroom</span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={onToggleTheme} compact />
            <a href="#/articles" className="inline-flex items-center gap-1.5 rounded-full border border-[#0E1420]/15 px-3.5 py-2 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.12em] no-underline transition-colors hover:border-[#C8862A] hover:text-[#C8862A]">
              <ArrowLeft size={12} /> All stories
            </a>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pt-10 pb-6 md:pt-14">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3">
          {article.category && (
            <span className="rounded-full bg-[#C8862A] px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#0E1420]">
              {article.category}
            </span>
          )}
          <span className={`inline-flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.13em] ${subtle}`}>
            <CalendarDays size={12} /> {formatDate(article.updatedAt || article.createdAt)}
          </span>
          {article.readMinutes ? (
            <span className={`inline-flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.13em] ${subtle}`}>
              <Clock3 size={12} /> {article.readMinutes} min read
            </span>
          ) : null}
        </div>

        <h1 className="mt-5 font-[Space_Grotesk] text-[32px] font-bold leading-[1.08] tracking-[-0.03em] md:text-[48px]">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className={`mt-4 text-[16px] leading-[1.7] md:text-[17.5px] ${muted}`}>{article.excerpt}</p>
        )}

        {/* Byline */}
        <div className={`mt-6 flex items-center gap-3 border-y py-4 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] text-sm font-bold text-[#C8862A]">
            {(article.author || 'N').split(' ').map(w => w[0]).slice(0, 2).join('')}
          </span>
          <div>
            <p className="font-[Space_Grotesk] text-[13.5px] font-bold">{article.author || settings.founderName}</p>
            <p className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] ${subtle}`}>
              {article.authorRole || settings.founderRole}
            </p>
          </div>
        </div>

        {/* Cover */}
        {article.coverImage && (
          <figure className="mt-8 overflow-hidden rounded-3xl shadow-xl">
            <img src={article.coverImage} alt={article.title} className="max-h-[480px] w-full object-cover" />
          </figure>
        )}

        {/* Body */}
        <div className={`prose-article mt-8 space-y-5 text-[15.5px] leading-[1.85] md:text-[16.5px] ${dark ? 'text-white/80' : 'text-[#0E1420]/85'}`}>
          {paragraphs.length === 0 && <p>No body content yet.</p>}
          {paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'font-medium first-letter:float-left first-letter:mr-3 first-letter:font-[Space_Grotesk] first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.9] first-letter:text-[#C8862A]' : ''}>
              {p}
            </p>
          ))}
        </div>

        {/* Tags */}
        {(article.tags || []).length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags!.map(tag => (
              <span key={tag} className={`rounded-full border px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.12em] ${dark ? 'border-white/15 text-white/60' : 'border-[#0E1420]/15 text-[#0E1420]/60'}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Gallery */}
        {(article.gallery || []).length > 0 && (
          <div className="mt-10">
            <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8862A]">Story gallery</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {article.gallery!.map((src, i) => (
                <button key={i} onClick={() => setGalleryOpen(src)} className="group overflow-hidden rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C8862A]">
                  <img src={src} alt={`${article.title} — photo ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Like + share bar */}
        <div className={`mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5 ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white shadow-sm'}`}>
          <button
            onClick={handleLike}
            disabled={likeBusy}
            className={`inline-flex items-center gap-2.5 rounded-full px-5 py-3 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.13em] transition-all ${
              liked ? 'bg-[#C0392B] text-white shadow-lg' : dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-[#0E1420] text-white hover:bg-[#16223A]'
            } disabled:opacity-60`}
          >
            <Heart size={15} className={liked ? 'fill-current' : ''} />
            {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
          </button>
          <div className="flex items-center gap-2">
            <span className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] ${subtle}`}>Share</span>
            <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noreferrer" title="Share on WhatsApp"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-110">
              <MessageCircle size={16} />
            </a>
            <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer" title="Share on X"
              className={`grid h-10 w-10 place-items-center rounded-full transition-transform hover:scale-110 ${dark ? 'bg-white text-[#0E1420]' : 'bg-[#0E1420] text-white'}`}>
              <span className="font-[Space_Grotesk] text-sm font-black">𝕏</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer" title="Share on Facebook"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#1877F2] font-[Space_Grotesk] text-lg font-black text-white transition-transform hover:scale-110">
              f
            </a>
            <button onClick={copyLink} title="Copy link"
              className={`grid h-10 w-10 place-items-center rounded-full border transition-all ${copied ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500' : dark ? 'border-white/20 text-white/70 hover:border-[#C8862A]' : 'border-[#0E1420]/20 text-[#0E1420]/60 hover:border-[#C8862A]'}`}>
              <span className="font-[JetBrains_Mono] text-[10px] font-bold">{copied ? '✓' : '⧉'}</span>
            </button>
          </div>
        </div>
      </article>

      {/* Comments */}
      <section className={`border-t ${dark ? 'border-white/10 bg-[#070A10]' : 'border-[#0E1420]/10 bg-white'}`}>
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="font-[Space_Grotesk] text-2xl font-bold tracking-tight">
            Discussion <span className="text-[#C8862A]">({comments.length})</span>
          </h2>

          {/* New comment */}
          <form
            onSubmit={e => submitComment(e, null, commentName, commentMsg, () => { setCommentName(''); setCommentMsg(''); }, setCommentSending)}
            className={`mt-6 rounded-3xl border p-5 md:p-6 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-[#FAF7F2]'}`}
          >
            <p className={`font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.18em] ${subtle}`}>Join the conversation</p>
            <input
              type="text" value={commentName} onChange={e => setCommentName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-black/30 text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'}`}
            />
            <textarea
              value={commentMsg} onChange={e => setCommentMsg(e.target.value)}
              placeholder="Share your thoughts on this story…"
              rows={3} maxLength={2000}
              className={`mt-3 w-full resize-y rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-black/30 text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'}`}
            />
            {commentError && <p className="mt-2 text-xs text-red-400">{commentError}</p>}
            <button type="submit" disabled={commentSending}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#C8862A] px-6 py-3 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              <Send size={13} /> {commentSending ? 'Posting…' : 'Post comment'}
            </button>
          </form>

          {/* Comment threads */}
          <div className="mt-8 space-y-5">
            {topLevel.length === 0 && (
              <p className={`rounded-2xl border border-dashed py-10 text-center text-sm ${dark ? 'border-white/15 text-white/40' : 'border-[#0E1420]/15 text-[#0E1420]/45'}`}>
                No comments yet — be the first to share your thoughts.
              </p>
            )}
            {topLevel.map(c => {
              const replies = repliesOf(c.id);
              const likedC = likedComments.has(c.id);
              return (
                <div key={c.id} className={`rounded-3xl border p-5 md:p-6 ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#0E1420]/10 bg-[#FAF7F2]'}`}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] text-sm font-bold text-[#C8862A]">
                      {c.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-[Space_Grotesk] text-[14px] font-bold">{c.name}</p>
                        <span className={`font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.12em] ${subtle}`}>{formatTime(c.date)}</span>
                      </div>
                      <p className={`mt-2 whitespace-pre-wrap text-[14px] leading-[1.7] ${dark ? 'text-white/75' : 'text-[#0E1420]/80'}`}>{c.message}</p>
                      <div className="mt-3 flex items-center gap-4">
                        <button onClick={() => handleCommentLike(c.id)} className={`inline-flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] font-bold transition-colors ${likedC ? 'text-[#C0392B]' : subtle + ' hover:text-[#C0392B]'}`}>
                          <Heart size={13} className={likedC ? 'fill-current' : ''} /> {c.likes || 0}
                        </button>
                        <button onClick={() => { setReplyTo(r => r === c.id ? null : c.id); setReplyName(''); setReplyMsg(''); }} className={`inline-flex items-center gap-1.5 font-[JetBrains_Mono] text-[10px] font-bold transition-colors ${subtle} hover:text-[#C8862A]`}>
                          <Reply size={13} /> Reply {replies.length > 0 && `(${replies.length})`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {replies.length > 0 && (
                    <div className="mt-4 space-y-3 border-l-2 border-[#C8862A]/40 pl-4 md:ml-6">
                      {replies.map(r => (
                        <div key={r.id} className={`rounded-2xl p-4 ${dark ? 'bg-black/25' : 'bg-white'}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-[Space_Grotesk] text-[13px] font-bold">{r.name}</p>
                            <span className={`font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.12em] ${subtle}`}>{formatTime(r.date)}</span>
                          </div>
                          <p className={`mt-1.5 whitespace-pre-wrap text-[13.5px] leading-[1.65] ${dark ? 'text-white/70' : 'text-[#0E1420]/75'}`}>{r.message}</p>
                          <button onClick={() => handleCommentLike(r.id)} className={`mt-2 inline-flex items-center gap-1.5 font-[JetBrains_Mono] text-[9.5px] font-bold transition-colors ${likedComments.has(r.id) ? 'text-[#C0392B]' : subtle + ' hover:text-[#C0392B]'}`}>
                            <Heart size={12} className={likedComments.has(r.id) ? 'fill-current' : ''} /> {r.likes || 0}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  {replyTo === c.id && (
                    <form
                      onSubmit={e => submitComment(e, c.id, replyName, replyMsg, () => { setReplyName(''); setReplyMsg(''); }, setReplySending)}
                      className={`mt-4 rounded-2xl border p-4 ${dark ? 'border-[#C8862A]/25 bg-[#C8862A]/[0.05]' : 'border-[#C8862A]/25 bg-[#C8862A]/[0.06]'}`}
                    >
                      <p className={`font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.16em] ${subtle}`}>Replying to {c.name}</p>
                      <input
                        type="text" value={replyName} onChange={e => setReplyName(e.target.value)}
                        placeholder="Your name" maxLength={60}
                        className={`mt-3 w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-black/30 text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'}`}
                      />
                      <textarea
                        value={replyMsg} onChange={e => setReplyMsg(e.target.value)}
                        placeholder="Write your reply…" rows={2} maxLength={2000}
                        className={`mt-2.5 w-full resize-y rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#C8862A] ${dark ? 'border-white/15 bg-black/30 text-white placeholder:text-white/30' : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'}`}
                      />
                      <div className="mt-3 flex gap-2">
                        <button type="submit" disabled={replySending} className="rounded-full bg-[#C8862A] px-5 py-2.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] text-[#0E1420] disabled:opacity-60">
                          {replySending ? 'Posting…' : 'Post reply'}
                        </button>
                        <button type="button" onClick={() => setReplyTo(null)} className={`rounded-full px-4 py-2.5 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.13em] ${subtle} hover:opacity-80`}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subscribe for more */}
      <section className={`border-t ${dark ? 'border-white/10 bg-[#090D15]' : 'border-[#0E1420]/10 bg-[#FAF7F2]'}`}>
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.25em] text-[#C8862A]">Never miss a story</p>
          <h2 className="mt-3 font-[Space_Grotesk] text-[26px] font-bold tracking-tight md:text-[34px]">Subscribe for more articles</h2>
          <p className={`mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed ${muted}`}>
            Get every new story in your inbox the moment it is published. Zero spam, unsubscribe anytime.
          </p>
          <div className="mt-2 [&_form]:!mt-6">
            <SubscribeInline dark={dark} />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className={`border-t pb-20 ${dark ? 'border-white/10 bg-[#090D15]' : 'border-[#0E1420]/10 bg-[#FAF7F2]'}`}>
          <div className="mx-auto max-w-6xl px-5 pt-12">
            <h2 className="font-[Space_Grotesk] text-xl font-bold tracking-tight">Keep reading</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(r => (
                <a key={r.id} href={`#/article/${r.slug}`}
                  className={`group overflow-hidden rounded-3xl border no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${dark ? 'border-white/10 bg-white/[0.04]' : 'border-[#0E1420]/10 bg-white'}`}>
                  <div className="h-36 overflow-hidden">
                    {r.coverImage ? (
                      <img src={r.coverImage} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[#0E1420]">
                        <span className="font-[Space_Grotesk] text-3xl font-black text-[#C8862A]/60">N</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="font-[JetBrains_Mono] text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#C8862A]">{r.category || 'Newsroom'}</p>
                    <h3 className="mt-2 line-clamp-2 font-[Space_Grotesk] text-[15px] font-bold leading-snug">{r.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-5 backdrop-blur-sm" onClick={() => setGalleryOpen(null)}>
          <img src={galleryOpen} alt="Gallery preview" className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          <button onClick={() => setGalleryOpen(null)} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 font-bold text-white backdrop-blur transition-colors hover:bg-white/20">
            ✕
          </button>
        </div>
      )}

      <footer className={`border-t py-8 ${dark ? 'border-white/10 bg-[#070A10]' : 'border-[#0E1420]/10 bg-white'}`}>
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 text-center sm:flex-row sm:text-left">
          <p className={`font-[JetBrains_Mono] text-[9.5px] tracking-wide ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>
            © {new Date().getFullYear()} {settings.copyrightText}
          </p>
          <a href="#/articles" className={`font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.13em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>
            ← All articles
          </a>
        </div>
      </footer>
    </div>
  );
}

function SubscribeInline({ dark }: { dark: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'exists' | 'invalid' | 'failed'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setStatus('invalid'); return; }
    setStatus('sending');
    try {
      const { addSubscriberInCloud } = await import('../cloud');
      const res = await addSubscriberInCloud({
        id: `sub_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        email: clean,
        date: new Date().toISOString(),
        status: 'active',
      });
      setStatus('sent');
      setEmail('');
      if (res === 'exists') setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  if (status === 'sent') {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-center">
        <p className="font-[Space_Grotesk] text-[16px] font-bold text-emerald-300">You're subscribed! 🎉</p>
        <p className="mt-1 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-white/55">
          Every new article lands in your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 max-w-md" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email" required placeholder="Your email address" value={email}
          onChange={e => setEmail(e.target.value)} disabled={status === 'sending'}
          className={`w-full flex-1 rounded-full border px-5 py-3.5 font-mono text-[12.5px] outline-none transition-colors focus:border-[#C8862A] disabled:opacity-60 ${
            dark ? 'border-white/20 bg-white/5 text-white placeholder:text-white/35' : 'border-[#0E1420]/20 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35'
          }`}
        />
        <button type="submit" disabled={status === 'sending'}
          className="shrink-0 rounded-full bg-[#C8862A] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
          {status === 'sending' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      {status === 'invalid' && <p className="mt-3 text-xs text-red-400">Please enter a valid email address.</p>}
      {status === 'failed' && <p className="mt-3 text-xs text-red-400">Something went wrong. Please try again.</p>}
      <p className={`mt-3 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
        Zero spam. Unsubscribe anytime.
      </p>
    </form>
  );
}

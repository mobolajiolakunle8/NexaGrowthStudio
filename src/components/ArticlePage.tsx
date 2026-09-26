import { useEffect, useMemo, useState } from 'react';
import {
  Heart, MessageSquare,
  Send, Share2, Check, Trash2,
} from 'lucide-react';
import type { Article, ArticleComment, SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import MobileNav from './MobileNav';
import { usePublicTheme } from '../hooks/usePublicTheme';
import {
  createArticleCommentInCloud,
  deleteArticleCommentInCloud,
  startArticleCommentSync,
  toggleArticleCommentLike,
  toggleArticleLike,
} from '../cloud';
import { generateId } from '../storage';

interface Props {
  article: Article;
  articles: Article[];
  settings: SiteSettings;
  isAdmin?: boolean;
}

const LIKED_ARTICLES_KEY = 'nexa_article_liked';
const LIKED_COMMENTS_KEY = 'nexa_comment_liked';

function readLikedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}

function writeLikedSet(key: string, set: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch { /* ignore */ }
}

export function readMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Split content into paragraphs; [[image:N]] markers become inline images. */
type Block =
  | { type: 'text'; text: string }
  | { type: 'image'; index: number };

function parseBody(content: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of content.split(/\n{2,}/)) {
    const p = raw.trim();
    if (!p) continue;
    const m = p.match(/^\[\[image:(\d+)\]\]$/i);
    if (m) blocks.push({ type: 'image', index: Number(m[1]) });
    else blocks.push({ type: 'text', text: p });
  }
  return blocks;
}

export default function ArticlePage({ article, articles, settings, isAdmin = false }: Props) {
  const { theme, dark, toggleTheme } = usePublicTheme(settings);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ArticleComment | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(article.likes || 0);
  const [liking, setLiking] = useState(false);
  const [likedComments, setLikedComments] = useState<Set<string>>(() => readLikedSet(LIKED_COMMENTS_KEY));
  const [copied, setCopied] = useState(false);

  // Reset per-article state when navigating between articles
  useEffect(() => {
    setLikeCount(article.likes || 0);
    setLiked(readLikedSet(LIKED_ARTICLES_KEY).has(article.id));
    setReplyTo(null);
    window.scrollTo({ top: 0 });
  }, [article.id, article.likes]);

  // Live comments for this article
  useEffect(() => {
    const stop = startArticleCommentSync(all => {
      setComments(all.filter(c => c.articleId === article.id));
    });
    return stop;
  }, [article.id]);

  const topLevel = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  const repliesFor = (id: string) => comments.filter(c => c.parentId === id);

  const related = useMemo(() => {
    const pool = articles.filter(a => a.id !== article.id && a.published !== false);
    const sameCat = pool.filter(a => a.category && a.category === article.category);
    const others = pool.filter(a => !a.category || a.category !== article.category);
    return [...sameCat, ...others].slice(0, 3);
  }, [articles, article.id, article.category]);

  const pageUrl = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}#/article/${article.slug}`;

  const handleLikeArticle = async () => {
    if (liking) return;
    setLiking(true);
    const delta = liked ? -1 : 1;
    setLiked(!liked);
    setLikeCount(c => Math.max(0, c + delta));
    try {
      await toggleArticleLike(article.id, delta as 1 | -1);
      const set = readLikedSet(LIKED_ARTICLES_KEY);
      if (delta === 1) set.add(article.id); else set.delete(article.id);
      writeLikedSet(LIKED_ARTICLES_KEY, set);
    } catch {
      setLiked(liked);
      setLikeCount(article.likes || 0);
    } finally {
      setLiking(false);
    }
  };

  const handleLikeComment = async (comment: ArticleComment) => {
    if (likedComments.has(comment.id)) return;
    try {
      await toggleArticleCommentLike(comment.id, 1);
      const next = new Set(likedComments);
      next.add(comment.id);
      setLikedComments(next);
      writeLikedSet(LIKED_COMMENTS_KEY, next);
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: (c.likes || 0) + 1 } : c));
    } catch { /* ignore — live sync will correct */ }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanMsg = message.trim();
    if (cleanName.length < 2) { setPostError('Please enter your name (at least 2 characters).'); return; }
    if (cleanMsg.length < 2) { setPostError('Please write a comment first.'); return; }
    setPosting(true);
    setPostError(null);
    try {
      await createArticleCommentInCloud({
        id: generateId(),
        articleId: article.id,
        parentId: replyTo ? replyTo.id : null,
        name: cleanName,
        message: cleanMsg.slice(0, 2000),
        likes: 0,
        date: new Date().toISOString(),
      });
      setMessage('');
      setReplyTo(null);
    } catch {
      setPostError('Could not post your comment. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (c: ArticleComment) => {
    if (!confirm(`Delete this ${c.parentId ? 'reply' : 'comment'}${!c.parentId && repliesFor(c.id).length ? ' and its replies' : ''}?`)) return;
    try {
      await deleteArticleCommentInCloud(c.id);
      if (!c.parentId) {
        await Promise.all(repliesFor(c.id).map(r => deleteArticleCommentInCloud(r.id)));
      }
    } catch { /* ignore */ }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${article.title}\n\n${article.excerpt}\n\nRead here: ${pageUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const navLinks: Array<[string, string, string]> = [
    ['Home', '#/', 'Home'],
    ['Articles', '#/articles', 'Articles'],
    ['Books', '#catalogue', 'Catalogue'],
  ];

  const darkCls = dark ? 'bg-[#090D15] text-[#F8F3EA]' : 'bg-[#FAF7F2] text-[#0E1420]';
  const panelCls = dark ? 'border-white/10 bg-white/[0.045]' : 'border-[#0E1420]/10 bg-white';
  const mutedCls = dark ? 'text-white/60' : 'text-[#0E1420]/70';
  const subtleCls = dark ? 'text-white/40' : 'text-[#0E1420]/45';
  const inputCls = dark
    ? 'border-white/15 bg-black/25 text-white placeholder:text-white/35 focus:border-[#C8862A]'
    : 'border-[#0E1420]/15 bg-white text-[#0E1420] placeholder:text-[#0E1420]/35 focus:border-[#C8862A]';

  const blocks = parseBody(article.content || '');

  return (
    <div className={`min-h-screen font-[Inter] transition-colors duration-700 ${darkCls}`}>
      <MobileNav settings={settings} navLinks={navLinks} currentPath="/articles" theme={theme} onToggleTheme={toggleTheme} />

      {/* Masthead */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? 'border-white/10 bg-[#090D15]/92' : 'border-[#0E1420]/10 bg-[#FAF7F2]/92'}`}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-3.5">
          <a href="#/articles" className="flex min-w-0 items-center gap-3 no-underline">
            <BrandLogo settings={settings} dark={dark} size="sm" />
            <span className={`font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.16em] ${mutedCls}`}>← All articles</span>
          </a>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggleTheme} compact />
            <button onClick={shareWhatsApp} className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#06281A]">
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Article hero */}
      <article className="mx-auto max-w-4xl px-5 pt-10 md:pt-14">
        <div className="flex flex-wrap items-center gap-2.5">
          {article.category && (
            <span className="rounded-full bg-[#A8452F] px-3.5 py-1.5 font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.16em] text-white">
              {article.category}
            </span>
          )}
          {(article.tags || []).slice(0, 4).map(t => (
            <span key={t} className={`rounded-full border px-3 py-1.5 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] ${dark ? 'border-white/15 text-white/55' : 'border-[#0E1420]/15 text-[#0E1420]/55'}`}>
              {t}
            </span>
          ))}
        </div>

        <h1 className="mt-5 font-[Space_Grotesk] text-[34px] font-bold leading-[1.04] tracking-[-0.03em] md:text-[52px]">
          {article.title}
        </h1>
        <p className={`mt-4 max-w-2xl text-[15.5px] leading-[1.7] md:text-[17px] ${mutedCls}`}>{article.excerpt}</p>

        <div className={`mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-4 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] ${dark ? 'border-white/10' : 'border-[#0E1420]/10'} ${subtleCls}`}>
          <span className="inline-flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#C8862A] font-[Space_Grotesk] text-[10px] font-black text-[#0E1420]">
              {(article.author || 'N').split(' ').map(p => p[0]).slice(0, 2).join('')}
            </span>
            <span className="font-bold normal-case tracking-normal text-[12px]" style={{ color: dark ? '#F8F3EA' : '#0E1420' }}>{article.author || settings.founderName}</span>
          </span>
          <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</span>
          <span>{readMinutes(article.content)} min read</span>
          <span className="inline-flex items-center gap-1"><Heart size={11} className="text-[#A8452F]" /> {likeCount}</span>
          <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {comments.length}</span>
        </div>

        {article.images[0] && (
          <figure className="mt-8 overflow-hidden rounded-[24px] shadow-xl">
            <img src={article.images[0]} alt={article.title} className="max-h-[480px] w-full object-cover" />
          </figure>
        )}

        {/* Body */}
        <div className="mx-auto mt-10 max-w-2xl space-y-6">
          {blocks.map((b, i) =>
            b.type === 'image' ? (
              article.images[b.index] ? (
                <figure key={i} className="overflow-hidden rounded-2xl shadow-lg">
                  <img src={article.images[b.index]} alt={`${article.title} — illustration ${b.index + 1}`} className="w-full object-cover" loading="lazy" />
                </figure>
              ) : null
            ) : (
              <p key={i} className={`text-[16px] leading-[1.85] ${dark ? 'text-white/80' : 'text-[#0E1420]/85'}`}>{b.text}</p>
            )
          )}
          {blocks.length === 0 && (
            <p className={`text-[15px] ${mutedCls}`}>This story is being prepared. Check back soon.</p>
          )}
        </div>

        {/* Like + share bar */}
        <div className={`mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${panelCls}`}>
          <button
            onClick={() => void handleLikeArticle()}
            disabled={liking}
            className={`inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.13em] transition-all ${
              liked
                ? 'bg-[#A8452F] text-white shadow-lg'
                : dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-[#0E1420]/5 text-[#0E1420] hover:bg-[#0E1420]/10'
            }`}
          >
            <Heart size={15} className={liked ? 'fill-white' : ''} />
            {liked ? 'Liked' : 'Like'} · {likeCount}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={shareWhatsApp} className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#06281A]">
              WhatsApp
            </button>
            <button
              onClick={() => void copyLink()}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${dark ? 'border-white/15 text-white/75 hover:bg-white/10' : 'border-[#0E1420]/15 text-[#0E1420] hover:bg-[#0E1420]/5'}`}
            >
              {copied ? <Check size={13} /> : <Share2 size={13} />} {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>

        {/* Comments */}
        <section className="mx-auto mt-14 max-w-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-[Space_Grotesk] text-[22px] font-bold md:text-[26px]">
              Conversation <span className="text-[#C8862A]">({comments.length})</span>
            </h2>
          </div>

          {/* Comment form */}
          <form onSubmit={e => void handlePostComment(e)} className={`mt-6 rounded-2xl border p-5 md:p-6 ${panelCls}`}>
            {replyTo && (
              <div className="mb-4 flex items-center justify-between rounded-xl bg-[#C8862A]/10 px-4 py-2.5 text-[12px]">
                <span className={mutedCls}>Replying to <strong>{replyTo.name}</strong></span>
                <button type="button" onClick={() => setReplyTo(null)} className="font-mono text-xs text-[#A8452F] hover:underline">Cancel</button>
              </div>
            )}
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:border-[#C8862A] focus:outline-none ${inputCls}`}
            />
            <textarea
              rows={3}
              placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Share your thoughts on this story…'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={2000}
              className={`mt-3 w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed focus:border-[#C8862A] focus:outline-none ${inputCls}`}
            />
            {postError && <p className="mt-2 text-xs text-red-400">{postError}</p>}
            <button
              type="submit"
              disabled={posting}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#C8862A] px-6 py-3 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Send size={13} /> {posting ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
            </button>
          </form>

          {/* Thread list */}
          <div className="mt-8 space-y-5">
            {topLevel.length === 0 && (
              <p className={`rounded-2xl border border-dashed py-10 text-center text-sm ${dark ? 'border-white/15 text-white/45' : 'border-[#0E1420]/15 text-[#0E1420]/50'}`}>
                No comments yet — start the conversation below.
              </p>
            )}
            {topLevel.map(c => (
              <div key={c.id} className={`rounded-2xl border p-5 ${panelCls}`}>
                <CommentBody
                  comment={c}
                  dark={dark}
                  liked={likedComments.has(c.id)}
                  isAdmin={isAdmin}
                  onLike={() => void handleLikeComment(c)}
                  onReply={() => setReplyTo(c)}
                  onDelete={() => void handleDeleteComment(c)}
                />
                {repliesFor(c.id).length > 0 && (
                  <div className={`ml-4 mt-4 space-y-4 border-l-2 pl-4 md:ml-6 ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
                    {repliesFor(c.id).map(r => (
                      <CommentBody
                        key={r.id}
                        comment={r}
                        dark={dark}
                        liked={likedComments.has(r.id)}
                        isAdmin={isAdmin}
                        onLike={() => void handleLikeComment(r)}
                        onDelete={() => void handleDeleteComment(r)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-[Space_Grotesk] text-[22px] font-bold">Keep reading</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              {related.map(r => (
                <a key={r.id} href={`#/article/${r.slug}`} className={`group overflow-hidden rounded-2xl border no-underline transition-all hover:-translate-y-1 ${panelCls}`}>
                  <div className={`h-32 overflow-hidden ${!r.images[0] ? 'bg-[#0E1420]' : ''}`}>
                    {r.images[0]
                      ? <img src={r.images[0]} alt={r.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      : <div className="grid h-full place-items-center font-[Space_Grotesk] text-3xl font-black text-[#C8862A]/40">{r.title.slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 font-[Space_Grotesk] text-[13.5px] font-bold leading-snug">{r.title}</p>
                    <p className="mt-1.5 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] text-[#C8862A]">Read →</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Subscribe band */}
        <section className="relative mt-16 overflow-hidden rounded-[28px] bg-[#0E1420] px-7 py-12 text-center text-white shadow-2xl md:px-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#C8862A]/18 blur-3xl" />
          <p className="relative font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.24em] text-[#C8862A]">Never miss a story</p>
          <h2 className="relative mx-auto mt-3 max-w-md font-[Space_Grotesk] text-[24px] font-bold leading-tight md:text-[30px]">Get every new article in your inbox.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-white/60">Join the subscriber list — one email per new story. Zero spam, unsubscribe anytime.</p>
          <div className="relative mx-auto mt-2 max-w-md">
            <SubscribeInline />
          </div>
        </section>

        {/* Footer strip */}
        <footer className={`mt-14 flex flex-col items-center justify-between gap-4 border-t py-8 sm:flex-row ${dark ? 'border-white/10' : 'border-[#0E1420]/10'}`}>
          <p className={`font-[JetBrains_Mono] text-[9.5px] tracking-wide ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
            © {new Date().getFullYear()} {settings.copyrightText}
          </p>
          <div className="flex items-center gap-4">
            <a href="#/articles" className={`font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.13em] no-underline hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>← All articles</a>
            <a href="#/" className={`font-[JetBrains_Mono] text-[9.5px] font-semibold uppercase tracking-[0.13em] no-underline hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>Home</a>
            <a href={`mailto:${settings.officialEmail}`} className={`font-[JetBrains_Mono] text-[9.5px] no-underline hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>{settings.officialEmail}</a>
          </div>
        </footer>
      </article>
    </div>
  );
}

function CommentBody({
  comment, dark, liked, isAdmin, onLike, onReply, onDelete,
}: {
  comment: ArticleComment;
  dark: boolean;
  liked: boolean;
  isAdmin: boolean;
  onLike: () => void;
  onReply?: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-[Space_Grotesk] text-[12px] font-black ${comment.isPublisher ? 'bg-[#C8862A] text-[#0E1420]' : dark ? 'bg-white/10 text-white/80' : 'bg-[#0E1420]/8 text-[#0E1420]'}`}>
            {(comment.name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div>
            <p className="flex items-center gap-2 font-[Space_Grotesk] text-[13px] font-bold">
              {comment.name}
              {comment.isPublisher && (
                <span className="rounded-full bg-[#C8862A]/15 px-2 py-0.5 font-[JetBrains_Mono] text-[8px] font-bold uppercase tracking-[0.12em] text-[#C8862A]">Publisher</span>
              )}
            </p>
            <p className={`font-[JetBrains_Mono] text-[8.5px] uppercase tracking-[0.12em] ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
              {new Date(comment.date).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={onDelete} title="Delete comment" className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <p className={`mt-2.5 whitespace-pre-wrap text-[13.5px] leading-[1.7] ${dark ? 'text-white/75' : 'text-[#0E1420]/80'}`}>{comment.message}</p>
      <div className="mt-2.5 flex items-center gap-3">
        <button
          onClick={onLike}
          disabled={liked}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-[JetBrains_Mono] text-[9.5px] font-bold transition-colors ${
            liked
              ? 'bg-[#A8452F]/15 text-[#E0876F] cursor-default'
              : dark ? 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-white' : 'bg-[#0E1420]/5 text-[#0E1420]/60 hover:bg-[#0E1420]/10'
          }`}
        >
          <Heart size={11} className={liked ? 'fill-current' : ''} /> {comment.likes || 0}
        </button>
        {onReply && (
          <button onClick={onReply} className={`font-[JetBrains_Mono] text-[9.5px] font-bold uppercase tracking-[0.12em] hover:text-[#C8862A] transition-colors ${dark ? 'text-white/50' : 'text-[#0E1420]/50'}`}>
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

function SubscribeInline() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'invalid' | 'failed'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setStatus('invalid'); return; }
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
    } catch {
      setStatus('failed');
    }
  };

  if (status === 'sent') {
    return (
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-center">
        <p className="font-[Space_Grotesk] text-[15px] font-bold text-emerald-300">You're subscribed! 🎉</p>
        <p className="mt-1 font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.14em] text-white/55">New stories land in your inbox.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row" noValidate>
      <input
        type="email"
        required
        placeholder="Your email address"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={status === 'sending'}
        className="w-full flex-1 rounded-full border border-white/20 bg-white/5 px-5 py-3.5 font-mono text-[12.5px] text-white placeholder:text-white/35 focus:border-[#C8862A] focus:outline-none disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        className="shrink-0 rounded-full bg-[#C8862A] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
      </button>
    </form>
  );
}

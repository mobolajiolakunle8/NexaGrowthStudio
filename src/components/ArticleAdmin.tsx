import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ImagePlus, Send } from 'lucide-react';
import type { Article, ArticleComment, SiteSettings } from '../types';
import {
  createArticleCommentInCloud,
  deleteArticleCommentInCloud,
  startArticleCommentSync,
} from '../cloud';
import { compressImageFile, approxDataUrlKB, generateId, slugify } from '../storage';

interface Props {
  article: Article | null;
  settings: SiteSettings;
  defaultAuthor: string;
  onSave: (article: Article, notifySubscribers: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

const EMPTY_ARTICLE = (author: string): Article => ({
  id: generateId(),
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  category: '',
  tags: [],
  author,
  coverImage: '',
  images: [],
  likes: 0,
  published: false,
  allowComments: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const inputCls =
  'w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#C8862A] transition-colors';

export default function ArticleAdmin({ article, settings, defaultAuthor, onSave, onDelete, onBack }: Props) {
  const [draft, setDraft] = useState<Article>(article ? { ...article, tags: [...(article.tags || [])], images: [...(article.images || [])] } : EMPTY_ARTICLE(defaultAuthor));
  const [tab, setTab] = useState<'edit' | 'comments'>('edit');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  // Comments (live)
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [replyTo, setReplyTo] = useState<ArticleComment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const isNew = !article;

  useEffect(() => {
    const stop = startArticleCommentSync(all => setComments(all.filter(c => c.articleId === draft.id)));
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const topLevel = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  const repliesFor = (id: string) => comments.filter(c => c.parentId === id);

  const set = <K extends keyof Article>(key: K, value: Article[K]) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const handleTitle = (title: string) => {
    setDraft(prev => ({
      ...prev,
      title,
      slug: isNew || !article?.slug ? slugify(title) : prev.slug,
    }));
  };

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (draft.images.length + files.length > 6) {
      setUploadMsg('⚠️ Maximum 6 images per article to keep pages fast.');
      e.target.value = '';
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    try {
      const compressed: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFile(file, 1000, 0.78);
        const kb = approxDataUrlKB(dataUrl);
        if (kb > 450) {
          setUploadMsg(`⚠️ "${file.name}" is still too large after compression (~${kb}KB). Try a smaller image.`);
          continue;
        }
        compressed.push(dataUrl);
      }
      if (compressed.length) {
        setDraft(prev => ({ ...prev, images: [...prev.images, ...compressed] }));
        setUploadMsg(`✓ ${compressed.length} image${compressed.length > 1 ? 's' : ''} attached. First image is the hero cover.`);
      }
    } catch {
      setUploadMsg('Could not process those images. Please try JPG or PNG files.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const moveImage = (index: number, dir: -1 | 1) => {
    const next = [...draft.images];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setDraft(prev => ({ ...prev, images: next }));
  };

  const handleSave = async (publish: boolean) => {
    setError(null);
    if (!draft.title.trim()) { setError('Please enter an article title.'); return; }
    if (!draft.excerpt.trim()) { setError('Please enter a short excerpt (shown on cards and emails).'); return; }
    if (!draft.content.trim()) { setError('Please write the article content.'); return; }
    const slug = (draft.slug || slugify(draft.title)).trim() || slugify(draft.title);
    setSaving(true);
    try {
      const wasPublished = article?.published === true;
      await onSave(
        { ...draft, slug, published: publish, publishedAt: publish ? article?.publishedAt || new Date().toISOString() : undefined },
        publish && notifyOnPublish && !wasPublished
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    await onDelete(article.id);
  };

  const handlePublisherReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTo || !replyText.trim() || replying) return;
    setReplying(true);
    try {
      await createArticleCommentInCloud({
        id: generateId(),
        articleId: draft.id,
        parentId: replyTo.id,
        name: settings.founderName,
        message: replyText.trim().slice(0, 2000),
        likes: 0,
        isPublisher: true,
        date: new Date().toISOString(),
      });
      setReplyText('');
      setReplyTo(null);
    } catch {
      setError('Could not post your reply. Please try again.');
    } finally {
      setReplying(false);
    }
  };

  const handleDeleteComment = async (c: ArticleComment) => {
    if (!confirm(`Delete this ${c.parentId ? 'reply' : 'comment'}?`)) return;
    try {
      await deleteArticleCommentInCloud(c.id);
      if (!c.parentId) {
        await Promise.all(repliesFor(c.id).map(r => deleteArticleCommentInCloud(r.id)));
      }
    } catch { /* live sync corrects */ }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-[Inter] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            {(['edit', 'comments'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition-all ${tab === t ? 'bg-[#C8862A] text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                {t === 'edit' ? '✏️ Write' : `💬 Comments (${comments.length})`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300">{error}</div>
        )}

        {tab === 'edit' && (
          <div className="space-y-5">
            <div>
              <h1 className="font-[Space_Grotesk] text-2xl font-bold text-white">{isNew ? 'New Article' : 'Edit Article'}</h1>
              <p className="mt-1 text-xs text-slate-400">Write once — it publishes to the blog, syncs to every browser, and can email all subscribers.</p>
            </div>

            {/* Title + slug */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">Headline *</label>
                <input type="text" value={draft.title} onChange={e => handleTitle(e.target.value)} placeholder="e.g. Why Most Nigerian Startups Undercharge" className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">Excerpt (card + email preview) *</label>
                <textarea rows={2} value={draft.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="One or two compelling sentences…" className={inputCls} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">Category</label>
                  <input type="text" value={draft.category} onChange={e => set('category', e.target.value)} placeholder="e.g. Strategy, Marketing, Mindset" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Author</label>
                  <input type="text" value={draft.author} onChange={e => set('author', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-slate-400">Hero image <span className="normal-case text-slate-500">(first uploaded image)</span></label>
                <div className={`rounded-xl border px-3.5 py-2.5 font-mono text-[11px] ${draft.images[0] ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>
                  {draft.images[0] ? '✓ Hero image set' : 'No images yet — upload below'}
                </div>
              </div>
            </section>

            {/* Body */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-3">
              <div>
                <h3 className="font-[Space_Grotesk] text-base font-bold text-[#C8862A]">📝 Article Body</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Separate paragraphs with a blank line. Type <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[#C8862A]">[[image:1]]</code> on its own line to place uploaded image #1 there (first image is also the hero/cover).
                </p>
              </div>
              <textarea
                rows={14}
                value={draft.content}
                onChange={e => set('content', e.target.value)}
                placeholder={"Opening paragraph…\n\n[[image:1]]\n\nNext paragraph…"}
                className={`${inputCls} font-mono !text-[13px] leading-relaxed resize-y min-h-[280px]`}
              />
              <p className="font-mono text-[10px] text-slate-500">
                {draft.content.trim().split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.round(draft.content.trim().split(/\s+/).filter(Boolean).length / 200))} min read
              </p>
            </section>

            {/* Images */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <div>
                <h3 className="font-[Space_Grotesk] text-base font-bold text-[#C8862A]">🖼️ Supporting Images</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">Upload from this device — images are compressed and saved with the article, so they sync to every browser. Max 6.</p>
              </div>

              {draft.images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {draft.images.map((img, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border border-slate-700">
                      <img src={img} alt={`Article image ${i + 1}`} className="h-28 w-full object-cover" />
                      <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[9px] font-bold text-white">
                        {i === 0 ? '★ HERO' : `IMG ${i + 1}`}
                      </span>
                      <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)} className="rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] text-white disabled:opacity-30">←</button>
                        <button type="button" disabled={i === draft.images.length - 1} onClick={() => moveImage(i, 1)} className="rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] text-white disabled:opacity-30">→</button>
                        <button
                          type="button"
                          onClick={() => setDraft(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                          className="rounded-lg bg-red-600/90 px-2 py-1 font-mono text-[10px] text-white"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700">
                  <ImagePlus size={14} /> {uploading ? 'Processing…' : 'Upload images'}
                <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
              </label>
              {uploadMsg && <p className="text-[11px] text-[#C8862A]">{uploadMsg}</p>}
            </section>

            {/* Tags */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-slate-400">Tags (click ✕ to remove, type + Enter to add)</label>
              <div className="flex flex-wrap gap-2">
                {draft.tags.map((tag, i) => (
                  <span key={`${tag}-${i}`} className="inline-flex items-center gap-2 rounded-full bg-[#C8862A]/12 pl-3 pr-1.5 py-1.5 text-xs font-semibold text-[#C8862A] ring-1 ring-[#C8862A]/25">
                    {tag}
                    <button type="button" onClick={() => setDraft(p => ({ ...p, tags: p.tags.filter((_, j) => j !== i) }))} className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-[#C8862A]/25 hover:text-white">✕</button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ add tag"
                  value={tagDraft}
                  onChange={e => setTagDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const val = tagDraft.trim().replace(/,+$/, '');
                      if (val) {
                        setDraft(p => ({ ...p, tags: [...p.tags, val] }));
                        setTagDraft('');
                      }
                    }
                  }}
                  className="w-32 rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C8862A]"
                />
              </div>
            </section>

            {/* Publish controls */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
              <h3 className="font-[Space_Grotesk] text-base font-bold text-[#C8862A]">🚀 Publish</h3>
              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-300">
                <input type="checkbox" checked={draft.allowComments !== false} onChange={e => setDraft(p => ({ ...p, allowComments: e.target.checked }))} className="h-4 w-4 accent-[#C8862A]" />
                Allow comments &amp; replies on this article
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-300">
                <input type="checkbox" checked={notifyOnPublish} onChange={e => setNotifyOnPublish(e.target.checked)} className="h-4 w-4 accent-[#C8862A]" />
                Email all subscribers when published
              </label>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button onClick={() => void handleSave(false)} disabled={saving} className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Saving…' : '💾 Save as Draft'}
                </button>
                <button onClick={() => void handleSave(true)} disabled={saving} className="flex-1 rounded-xl bg-[#C8862A] px-5 py-3 text-xs font-bold text-[#0E1420] transition hover:bg-[#d8963a] disabled:opacity-50">
                  {saving ? 'Publishing…' : article?.published ? '✓ Update Live Article' : '🚀 Publish Now'}
                </button>
              </div>
              {saved && <p className="text-xs text-emerald-400">✓ Saved and synced to every browser.</p>}
              {!isNew && (
                <div className="border-t border-slate-800 pt-4">
                  {deleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => void handleDelete()} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500">Confirm delete</button>
                      <button onClick={() => setDeleteConfirm(false)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-white">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(true)} className="text-xs text-red-400 hover:text-red-300 hover:underline">🗑 Delete this article</button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'comments' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {comments.length} comment{comments.length === 1 ? '' : 's'} total. Reply as the publisher or remove spam.
            </p>
            {topLevel.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-700 py-14 text-center">
                <p className="text-sm text-slate-400">No comments yet on this article.</p>
              </div>
            )}
            {topLevel.map(c => (
              <div key={c.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <CommentRow comment={c} onReply={() => setReplyTo(c)} onDelete={() => void handleDeleteComment(c)} />
                {repliesFor(c.id).length > 0 && (
                  <div className="ml-4 mt-4 space-y-3 border-l-2 border-slate-800 pl-4">
                    {repliesFor(c.id).map(r => (
                      <CommentRow key={r.id} comment={r} onDelete={() => void handleDeleteComment(r)} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {replyTo && (
              <form onSubmit={e => void handlePublisherReply(e)} className="rounded-2xl border border-[#C8862A]/30 bg-[#C8862A]/5 p-5">
                <p className="text-xs text-slate-300">Replying to <strong className="text-white">{replyTo.name}</strong> as {settings.founderName}</p>
                <textarea
                  rows={3}
                  autoFocus
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write your publisher reply…"
                  className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[#C8862A] focus:outline-none"
                />
                <div className="mt-3 flex gap-2">
                  <button type="submit" disabled={replying || !replyText.trim()} className="rounded-xl bg-[#C8862A] px-4 py-2 text-xs font-bold text-[#0E1420] disabled:opacity-50">
                    {replying ? 'Sending…' : 'Send reply'}
                  </button>
                  <button type="button" onClick={() => { setReplyTo(null); setReplyText(''); }} className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-white">Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CommentRow({ comment, onReply, onDelete }: {
  comment: import('../types').ArticleComment;
  onReply?: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-[Space_Grotesk] text-[11px] font-black ${comment.isPublisher ? 'bg-[#C8862A] text-[#0E1420]' : 'bg-slate-800 text-slate-300'}`}>
            {(comment.name || '?').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div>
            <p className="flex items-center gap-2 text-[13px] font-bold text-white">
              {comment.name}
              {comment.isPublisher && (
                <span className="rounded-full bg-[#C8862A]/15 px-2 py-0.5 font-[JetBrains_Mono] text-[8px] font-bold uppercase tracking-wider text-[#C8862A]">Publisher</span>
              )}
            </p>
            <p className="font-[JetBrains_Mono] text-[9px] text-slate-500">
              {new Date(comment.date).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · ❤ {comment.likes || 0}
            </p>
          </div>
        </div>
        <button onClick={onDelete} title="Delete" className="text-slate-500 transition-colors hover:text-red-400">✕</button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-300">{comment.message}</p>
      {onReply && (
        <button onClick={onReply} className="mt-2 inline-flex items-center gap-1 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.12em] text-[#C8862A] hover:underline">
          <Send size={11} /> Reply as publisher
        </button>
      )}
    </div>
  );
}

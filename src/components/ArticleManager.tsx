import { useState } from 'react';
import type { Article, SiteSettings } from '../types';
import { generateId, slugify, compressImageFile } from '../storage';
import {
  saveArticleToCloud,
  deleteArticleInCloud,
  startSubscriberSync,
} from '../cloud';
import { sendWeb3Form, newArticleTemplate } from '../email';

interface Props {
  articles: Article[];
  settings: SiteSettings;
  onArticlesChange: (articles: Article[]) => void;
}

const EMPTY_DRAFT = (): Partial<Article> => ({
  title: '',
  excerpt: '',
  category: 'Business',
  tags: [],
  body: '',
  coverImage: '',
  images: [],
  published: true,
  featured: false,
});

const inputCls = 'w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white transition-colors';

export default function ArticleManager({ articles, settings, onArticlesChange }: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Article>>(EMPTY_DRAFT());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setDraft(EMPTY_DRAFT());
    setEditingId(null);
    setEditorOpen(true);
  };

  const openEdit = (article: Article) => {
    setDraft({
      ...article,
      tags: [...(article.tags || [])],
      images: [...(article.images || [])],
    });
    setEditingId(article.id);
    setEditorOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    if (!draft.title?.trim()) return alert('Please enter an article headline.');
    if (!(draft.body || '').trim()) return alert('Please write the article body.');
    setSaving(true);

    const isNew = !editingId;
    let slug = editingId && draft.slug ? draft.slug : slugify(draft.title!);
    if (articles.some(a => a.slug === slug && a.id !== editingId)) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }
    const article: Article = {
      id: editingId || generateId(),
      slug,
      title: draft.title!.trim(),
      excerpt: (draft.excerpt || '').trim() || (draft.body || '').trim().slice(0, 180),
      category: (draft.category || 'General').trim() || 'General',
      tags: (draft.tags || []).map(t => t.trim()).filter(Boolean),
      body: (draft.body || '').trim(),
      coverImage: draft.coverImage || undefined,
      images: draft.images || [],
      likes: [],
      comments: [],
      published: publish,
      featured: draft.featured === true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const existing = articles.find(a => a.id === editingId);
        if (existing) {
          // Preserve engagement + original date on edit
          article.likes = existing.likes || [];
          article.comments = existing.comments || [];
          article.createdAt = existing.createdAt;
        }
      }
      const saved = await saveArticleToCloud(article);
      const others = articles.filter(a => a.id !== saved.id);
      onArticlesChange([saved, ...others]);

      // Notify every active subscriber when a NEW article goes live
      if (isNew && publish) {
        void (async () => {
          try {
            const holder: { subs: Array<{ email: string; status?: string }> } = { subs: [] };
            const stop = startSubscriberSync(subs => { holder.subs = subs; });
            setTimeout(async () => {
              stop();
              const active = (holder.subs || []).filter(s => s.status !== 'unsubscribed');
              let sent = 0;
              for (const sub of active) {
                try {
                  await sendWeb3Form(newArticleTemplate(saved, sub.email, settings));
                  sent += 1;
                } catch { /* continue */ }
              }
              alert(sent > 0
                ? `Article published! ${sent} subscriber${sent === 1 ? '' : 's'} notified by email.`
                : 'Article published! (No active subscribers to notify yet.)');
            }, 1500);
          } catch { /* ignore */ }
        })();
      }

      setEditorOpen(false);
      setDraft(EMPTY_DRAFT());
      setEditingId(null);
    } catch (err) {
      alert(`Could not save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteArticleInCloud(id);
      onArticlesChange(articles.filter(a => a.id !== id));
    } catch {
      alert('Delete failed. Check your connection and try again.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleTogglePublish = async (article: Article) => {
    const updated = { ...article, published: !article.published };
    try {
      const saved = await saveArticleToCloud(updated);
      onArticlesChange(articles.map(a => (a.id === saved.id ? saved : a)));
    } catch {
      alert('Could not update publish status. Check your connection.');
    }
  };

  const articleUrl = (a: Article) => `${window.location.origin}${window.location.pathname}#/article/${a.slug}`;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Total Articles</span>
          <span className="text-2xl font-bold text-white font-[Space_Grotesk] mt-1 block">{articles.length}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Published</span>
          <span className="text-2xl font-bold text-emerald-400 font-[Space_Grotesk] mt-1 block">{articles.filter(a => a.published).length}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Total Likes</span>
          <span className="text-2xl font-bold text-[#C8862A] font-[Space_Grotesk] mt-1 block">
            {articles.reduce((n, a) => n + (a.likes?.length || 0), 0)}
          </span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Comments</span>
          <span className="text-2xl font-bold text-blue-400 font-[Space_Grotesk] mt-1 block">
            {articles.reduce((n, a) => n + (a.comments || []).reduce((m, c) => m + 1 + (c.replies?.length || 0), 0), 0)}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search articles by title or category…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#C8862A] text-white w-full max-w-sm"
        />
        <button
          onClick={openCreate}
          className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
        >
          ✍️ Write New Article
        </button>
        <span className="text-xs text-slate-400 font-mono">{filtered.length} shown</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
          <span className="text-4xl mb-3">📰</span>
          <h3 className="font-[Space_Grotesk] font-bold text-lg mb-1">No articles yet</h3>
          <p className="text-sm text-slate-400 mb-5 max-w-sm">Publish your first story — it appears on the Articles page and emails every subscriber.</p>
          <button onClick={openCreate} className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition">✍️ Write First Article</button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 hover:border-slate-700 transition-colors">
              <div className="shrink-0">
                {a.coverImage ? (
                  <img src={a.coverImage} alt={a.title} className="h-28 w-40 rounded-xl object-cover border border-slate-800" />
                ) : (
                  <div className="grid h-28 w-40 place-items-center rounded-xl bg-slate-900 border border-slate-800 font-[Space_Grotesk] text-2xl font-black text-[#C8862A]/60">
                    {(a.title || 'N')[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#C8862A]/15 text-[#C8862A] border border-[#C8862A]/30">{a.category}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {a.published ? '● Live' : '○ Draft'}
                  </span>
                  {a.featured && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">★ Featured</span>}
                  <span className="text-[10px] font-mono text-slate-500">♥ {a.likes.length} · 💬 {(a.comments || []).length}</span>
                </div>
                <h3 className="font-[Space_Grotesk] font-bold text-white text-base leading-snug">{a.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-1 mt-1">{a.excerpt}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  {new Date(a.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => openEdit(a)} className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition">Edit</button>
                  <a href={`#/article/${a.slug}`} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-xl border border-slate-700 transition no-underline">Preview</a>
                  <button onClick={() => void handleTogglePublish(a)} className={`text-xs px-4 py-2 rounded-xl border transition ${a.published ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/20'}`}>
                    {a.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(articleUrl(a)); alert('Article link copied!'); }}
                    className="text-xs px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition"
                  >
                    Copy link
                  </button>
                  {deleteConfirm === a.id ? (
                    <>
                      <button onClick={() => void handleDelete(a.id)} className="text-xs py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition">Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-xs py-2 px-3 bg-slate-800 text-white rounded-xl">✕</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(a.id)} className="text-xs px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition">🗑</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto px-4 py-8" onClick={() => setEditorOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative mx-auto my-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#C8862A] mb-1">
              {editingId ? 'Edit Article' : 'Write New Article'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {editingId ? 'Update any field and save. Changes sync to every browser instantly.' : 'Publishing sends an email alert to every subscriber.'}
            </p>

            <div className="flex flex-col gap-4 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Headline *</label>
                <input type="text" value={draft.title || ''} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. 5 Pricing Mistakes Killing Nigerian Startups" className={inputCls} />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Standfirst / Summary</label>
                <textarea value={draft.excerpt || ''} onChange={e => setDraft(p => ({ ...p, excerpt: e.target.value }))} rows={2}
                  placeholder="One or two sentences shown on cards and in emails…"
                  className={`${inputCls} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Category *</label>
                  <input type="text" value={draft.category || ''} list="article-cats"
                    onChange={e => setDraft(p => ({ ...p, category: e.target.value }))} className={`${inputCls} font-mono`} />
                  <datalist id="article-cats">
                    {['Business', 'Marketing', 'Mindset', 'Founder Stories', 'Money', 'Announcements', 'Lifestyle'].map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Tags (comma-separated)</label>
                  <input type="text" value={(draft.tags || []).join(', ')}
                    onChange={e => setDraft(p => ({ ...p, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    className={inputCls} placeholder="sales, pricing" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Story Body * (blank line = new paragraph)</label>
                <textarea value={draft.body || ''} onChange={e => setDraft(p => ({ ...p, body: e.target.value }))} rows={10}
                  placeholder={'Write the story here...\n\nLeave a blank line between paragraphs.'}
                  className={`${inputCls} resize-y font-[Inter] leading-relaxed`} />
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  {(draft.body || '').trim().split(/\s+/).filter(Boolean).length} words · ~{Math.max(1, Math.round((draft.body || '').trim().split(/\s+/).filter(Boolean).length / 200))} min read
                </p>
              </div>

              {/* Cover upload */}
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">Cover Photo (local upload)</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {draft.coverImage && (
                    <img src={draft.coverImage} alt="Cover preview" className="w-24 h-16 object-cover rounded-lg border border-slate-700" />
                  )}
                  <label className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs cursor-pointer transition text-white">
                    {uploading === 'cover' ? 'Uploading…' : draft.coverImage ? 'Replace Cover' : 'Upload Cover'}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading('cover');
                      try {
                        const url = await compressImageFile(file, 1400, 0.8);
                        setDraft(p => ({ ...p, coverImage: url }));
                      } catch { alert('Could not process that image. Try a JPG or PNG.'); }
                      finally { setUploading(null); e.target.value = ''; }
                    }} className="hidden" />
                  </label>
                  {draft.coverImage && (
                    <button onClick={() => setDraft(p => ({ ...p, coverImage: undefined }))} className="text-red-400 text-xs hover:underline">Remove</button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Auto-compressed &amp; synced to every browser. Shown at the top of the article and in emails.</p>
              </div>

              {/* Gallery upload */}
              <div className="border border-slate-800 bg-slate-950/60 rounded-xl p-4">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                  Supporting Photos ({(draft.images || []).length}/8)
                </label>
                {(draft.images || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(draft.images || []).map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt={`Supporting ${i + 1}`} className="w-20 h-14 object-cover rounded-lg border border-slate-700" />
                        <button
                          onClick={() => setDraft(p => ({ ...p, images: (p.images || []).filter((_, j) => j !== i) }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-red-600 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs cursor-pointer transition text-white inline-block">
                  {uploading === 'gallery' ? 'Uploading…' : '+ Add Photos (up to 8 total)'}
                  <input type="file" accept="image/*" multiple onChange={async (e) => {
                    const files = Array.from(e.target.files || []).slice(0, 8 - (draft.images || []).length);
                    if (!files.length) return;
                    setUploading('gallery');
                    try {
                      const urls: string[] = [];
                      for (const f of files) urls.push(await compressImageFile(f, 1100, 0.78));
                      setDraft(p => ({ ...p, images: [...(p.images || []), ...urls].slice(0, 8) }));
                    } catch { alert('One or more images failed. Try JPG or PNG files.'); }
                    finally { setUploading(null); e.target.value = ''; }
                  }} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-500 mt-2">Inserted as a photo gallery inside the article.</p>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={draft.featured === true}
                  onChange={e => setDraft(p => ({ ...p, featured: e.target.checked }))}
                  className="w-4 h-4 accent-[#C8862A]"
                />
                <span><b className="text-white">Feature this story</b> <span className="text-slate-500">— shows as the hero story on the Articles page</span></span>
              </label>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => void handleSave(false)}
                  disabled={saving || !draft.title?.trim()}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition border border-slate-700"
                >
                  {saving ? 'Saving…' : '💾 Save Draft'}
                </button>
                <button
                  onClick={() => void handleSave(true)}
                  disabled={saving || !draft.title?.trim()}
                  className="bg-[#C8862A] hover:bg-[#d8963a] disabled:opacity-50 text-slate-950 font-bold text-sm py-3 rounded-xl transition shadow-md"
                >
                  {saving ? 'Publishing…' : '🚀 Publish Now'}
                </button>
              </div>
              {!editingId && (
                <p className="text-[10.5px] text-slate-500 text-center">Publishing a new article emails every subscriber automatically.</p>
              )}
            </div>

            <button onClick={() => { setEditorOpen(false); setEditingId(null); }} className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

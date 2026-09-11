import { useState } from 'react';
import type { Article } from '../types';
import { approxDataUrlKB, compressImageFile, estimateReadMinutes, generateId, slugify } from '../storage';

interface Props {
  articles: Article[];
  onArticlesChange: (updated: Article[], notifyIds?: string[]) => void;
}

interface Draft {
  title: string;
  excerpt: string;
  category: string;
  tags: string;
  author: string;
  bodyText: string;
  coverImage?: string;
  images: string[];
  featured: boolean;
  published: boolean;
}

const EMPTY_DRAFT: Draft = {
  title: '',
  excerpt: '',
  category: 'Insights',
  tags: '',
  author: 'Olakunle Samuel',
  bodyText: '',
  coverImage: undefined,
  images: [],
  featured: false,
  published: true,
};

const inputCls = 'w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#C8862A] text-white transition-colors';

export default function ArticleManager({ articles, onArticlesChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );
  const publishedCount = articles.filter(a => a.published !== false).length;

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
    setMsg(null);
    setModalOpen(true);
  };

  const openEdit = (a: Article) => {
    setEditingId(a.id);
    setDraft({
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      tags: (a.tags || []).join(', '),
      author: a.author,
      bodyText: (a.body || []).join('\n\n'),
      coverImage: a.coverImage,
      images: a.images || [],
      featured: !!a.featured,
      published: a.published !== false,
    });
    setMsg(null);
    setModalOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg('Please choose an image file (JPG, PNG or WebP).'); e.target.value = ''; return; }
    setUploading('cover');
    setMsg('Optimizing cover image…');
    try {
      const dataUrl = await compressImageFile(file, 1200, 0.8);
      const kb = approxDataUrlKB(dataUrl);
      if (kb > 600) {
        setMsg('Cover is still too large after optimization. Please use a smaller image.');
        return;
      }
      setDraft(p => ({ ...p, coverImage: dataUrl }));
      setMsg(`✓ Cover attached (~${kb}KB). Save to publish it.`);
    } catch (err) {
      setMsg(`Cover upload failed: ${err instanceof Error ? err.message : 'try another image.'}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (draft.images.length + files.length > 4) {
      setMsg('You can attach up to 4 supporting images per article.');
      e.target.value = '';
      return;
    }
    setUploading('gallery');
    setMsg('Optimizing supporting images…');
    try {
      const done: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFile(file, 1000, 0.78);
        if (approxDataUrlKB(dataUrl) > 500) continue;
        done.push(dataUrl);
      }
      if (!done.length) {
        setMsg('Those images could not be used. Try smaller JPG or PNG files.');
        return;
      }
      setDraft(p => ({ ...p, images: [...p.images, ...done].slice(0, 4) }));
      setMsg(`✓ ${done.length} supporting image${done.length === 1 ? '' : 's'} attached. Save to publish.`);
    } catch (err) {
      setMsg(`Image upload failed: ${err instanceof Error ? err.message : 'try again.'}`);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    if (!draft.title.trim()) { setMsg('Please enter an article title.'); return; }
    if (!draft.excerpt.trim()) { setMsg('Please enter a short excerpt.'); return; }
    const body = draft.bodyText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (!body.length) { setMsg('Please write the article body (separate paragraphs with a blank line).'); return; }

    setSaving(true);
    const now = new Date().toISOString();
    const tags = draft.tags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingId) {
      const prev = articles.find(a => a.id === editingId);
      const updated: Article = {
        id: editingId,
        slug: (prev?.slug || slugify(draft.title)) as string,
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim(),
        category: draft.category.trim() || 'Insights',
        tags,
        coverImage: draft.coverImage,
        images: draft.images,
        body,
        author: draft.author.trim() || 'Nexa Growth Studio',
        readMinutes: estimateReadMinutes(body),
        featured: draft.featured,
        published: draft.published,
        createdAt: prev?.createdAt || now,
        updatedAt: now,
      };
      const list = articles.map(a => (a.id === editingId ? updated : a));
      const newlyPublished = draft.published && prev?.published === false;
      onArticlesChange(list, newlyPublished ? [editingId] : []);
    } else {
      const id = generateId();
      let slug = slugify(draft.title) || `article-${id}`;
      let n = 1;
      while (articles.some(a => a.slug === slug)) slug = `${slugify(draft.title)}-${++n}`;
      const created: Article = {
        id,
        slug,
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim(),
        category: draft.category.trim() || 'Insights',
        tags,
        coverImage: draft.coverImage,
        images: draft.images,
        body,
        author: draft.author.trim() || 'Nexa Growth Studio',
        readMinutes: estimateReadMinutes(body),
        featured: draft.featured,
        published: draft.published,
        createdAt: now,
        updatedAt: now,
      };
      onArticlesChange([created, ...articles], draft.published ? [id] : []);
    }
    setSaving(false);
    setModalOpen(false);
    setDraft({ ...EMPTY_DRAFT });
    setEditingId(null);
  };

  const handleTogglePublish = (a: Article) => {
    const next = !a.published;
    const list = articles.map(x => (x.id === a.id ? { ...x, published: next, updatedAt: new Date().toISOString() } : x));
    onArticlesChange(list, next ? [a.id] : []);
  };

  const handleDelete = (id: string) => {
    onArticlesChange(articles.filter(a => a.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Total Articles</span>
          <span className="text-2xl font-bold text-white font-[Space_Grotesk] mt-1 block">{articles.length}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Published</span>
          <span className="text-2xl font-bold text-emerald-400 font-[Space_Grotesk] mt-1 block">{publishedCount}</span>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-400 block font-mono uppercase">Drafts</span>
          <span className="text-2xl font-bold text-[#C8862A] font-[Space_Grotesk] mt-1 block">{articles.length - publishedCount}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search articles by title or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#C8862A] text-white w-full max-w-sm"
        />
        <span className="text-xs text-slate-400 font-mono">{filtered.length} found</span>
        <button
          onClick={openCreate}
          className="ml-auto bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md"
        >
          + New Article
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
          <span className="text-4xl mb-3">📰</span>
          <h3 className="font-[Space_Grotesk] font-bold text-lg mb-1">No articles yet</h3>
          <p className="text-sm text-slate-400 mb-5 max-w-sm">Publish your first story — it appears on the Articles page and emails every subscriber.</p>
          <button onClick={openCreate} className="bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition">+ Write First Article</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(a => (
            <div key={a.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-slate-700 transition-colors">
              <div className="relative h-40 bg-slate-900 overflow-hidden">
                {a.coverImage ? (
                  <img src={a.coverImage} alt={a.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-900 to-slate-950">
                    <span className="font-[Space_Grotesk] text-3xl font-black text-[#C8862A]/40">N</span>
                  </div>
                )}
                <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.13em] ${a.published ? 'bg-emerald-500/90 text-slate-950' : 'bg-slate-800/90 text-slate-300'}`}>
                  {a.published ? '● Live' : '○ Draft'}
                </span>
                {a.featured && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#C8862A] px-2.5 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-[0.13em] text-slate-950">
                    ★ Featured
                  </span>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.16em] text-[#C8862A]">{a.category || 'Insights'} · {a.readMinutes || 3} min</p>
                <h3 className="mt-2 font-[Space_Grotesk] font-bold text-white text-[15px] leading-snug line-clamp-2">{a.title}</h3>
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">{a.excerpt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => openEdit(a)} className="flex-1 bg-[#C8862A] hover:bg-[#d8963a] text-slate-950 font-bold text-xs py-2 rounded-xl transition">Edit</button>
                  <a href={`#/article/${a.slug}`} target="_blank" rel="noreferrer" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs py-2 rounded-xl border border-slate-700 transition text-center no-underline">Preview</a>
                  <button onClick={() => handleTogglePublish(a)} className={`text-xs px-3 py-2 rounded-xl border transition ${a.published ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/20'}`}>
                    {a.published ? 'Unpublish' : 'Publish'}
                  </button>
                  {deleteConfirm === a.id ? (
                    <>
                      <button onClick={() => handleDelete(a.id)} className="text-xs py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition">Confirm</button>
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

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setModalOpen(false)}>
          <div className="mx-auto my-8 max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="font-[Space_Grotesk] text-xl font-bold text-[#C8862A] mb-1">{editingId ? 'Edit Article' : 'Write New Article'}</h3>
            <p className="text-xs text-slate-400 mb-5">Publishing notifies every subscriber by email automatically.</p>

            {msg && (
              <div className={`mb-4 rounded-xl border p-3 text-xs font-semibold ${msg.startsWith('✓') ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'}`}>
                {msg}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Headline *</label>
                <input type="text" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="e.g. 5 Pricing Mistakes Killing Nigerian Startups" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Standfirst / Excerpt *</label>
                <textarea rows={2} value={draft.excerpt} onChange={e => setDraft(p => ({ ...p, excerpt: e.target.value }))} placeholder="One or two sentences shown on cards and in the announcement email…" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Category</label>
                  <input type="text" value={draft.category} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))} placeholder="Insights" className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Author</label>
                  <input type="text" value={draft.author} onChange={e => setDraft(p => ({ ...p, author: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Tags (comma-separated)</label>
                <input type="text" value={draft.tags} onChange={e => setDraft(p => ({ ...p, tags: e.target.value }))} placeholder="sales, pricing, nigeria" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Article Body * (blank line = new paragraph)</label>
                <textarea rows={10} value={draft.bodyText} onChange={e => setDraft(p => ({ ...p, bodyText: e.target.value }))} placeholder="Write the story here…&#10;&#10;Leave a blank line between paragraphs." className={`${inputCls} font-[Inter] leading-relaxed`} />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Cover Image (local upload)</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {draft.coverImage && <img src={draft.coverImage} alt="Cover preview" className="h-20 w-32 rounded-lg border border-slate-700 object-cover" />}
                  <label className="inline-block cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">
                    {uploading === 'cover' ? 'Optimizing…' : draft.coverImage ? 'Replace Cover' : 'Upload Cover'}
                    <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                  </label>
                  {draft.coverImage && (
                    <button type="button" onClick={() => setDraft(p => ({ ...p, coverImage: undefined }))} className="text-xs text-red-400 hover:underline">Remove</button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 block font-mono">Supporting Images (up to 4, woven into the story)</label>
                {draft.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {draft.images.map((src, i) => (
                      <div key={i} className="group relative">
                        <img src={src} alt="" className="h-16 w-full rounded-lg border border-slate-700 object-cover" />
                        <button
                          type="button"
                          onClick={() => setDraft(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full bg-red-600 text-[10px] text-white group-hover:grid"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="inline-block cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">
                  {uploading === 'gallery' ? 'Optimizing…' : '+ Add Images'}
                  <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                </label>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={draft.featured} onChange={e => setDraft(p => ({ ...p, featured: e.target.checked }))} className="h-4 w-4 accent-[#C8862A]" />
                  Feature as top story
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={draft.published} onChange={e => setDraft(p => ({ ...p, published: e.target.checked }))} className="h-4 w-4 accent-[#C8862A]" />
                  Publish immediately
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || uploading !== null}
                className="w-full rounded-xl bg-[#C8862A] py-3.5 text-sm font-bold text-slate-950 transition hover:bg-[#d8963a] disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : draft.published ? '🚀 Publish & Email Subscribers' : 'Save Draft'}
              </button>
            </div>

            <button onClick={() => setModalOpen(false)} className="absolute right-4 top-4 text-slate-500 hover:text-slate-300 font-bold">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

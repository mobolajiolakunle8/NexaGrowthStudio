import { useMemo, useState } from 'react';
import type { Article, SiteSettings } from '../types';
import { generateId, slugify, compressImageFile, approxDataUrlKB } from '../storage';
import { saveArticleToCloud, deleteArticleFromCloud, fetchSubscribersOnce } from '../cloud';
import { newArticleTemplate, sendWeb3Form } from '../email';

interface Props {
  articles: Article[];
  settings: SiteSettings;
  onArticlesChange: (articles: Article[]) => void;
}

const EMPTY_DRAFT: Omit<Article, 'id' | 'slug' | 'createdAt' | 'updatedAt'> = {
  title: '',
  excerpt: '',
  category: 'Business Growth',
  tags: [],
  coverImage: '',
  gallery: [],
  body: '',
  author: 'Olakunle Samuel',
  authorRole: 'Founder & Publisher',
  published: false,
  featured: false,
};

export default function ArticlesManager({ articles, settings, onArticlesChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Article, 'id' | 'slug' | 'createdAt' | 'updatedAt'>>(EMPTY_DRAFT);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState<'cover' | 'gallery' | null>(null);
  const [notifyLog, setNotifyLog] = useState<string | null>(null);

  const sorted = useMemo(
    () => articles.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
    [articles]
  );

  const reset = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setTagInput('');
  };

  const startEdit = (a: Article) => {
    setEditingId(a.id);
    setDraft({
      title: a.title, excerpt: a.excerpt, category: a.category, tags: [...(a.tags || [])],
      coverImage: a.coverImage || '', gallery: [...(a.gallery || [])], body: a.body,
      author: a.author, authorRole: a.authorRole, published: a.published, featured: !!a.featured,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImage = async (_e: React.ChangeEvent<HTMLInputElement>, file: File, target: 'cover' | 'gallery') => {
    setUploading(target);
    setMsg(null);
    try {
      const compressed = await compressImageFile(file, target === 'cover' ? 1200 : 900, 0.8);
      const kb = approxDataUrlKB(compressed);
      if (kb > 700) {
        setMsg({ ok: false, text: `That image is still ~${kb}KB after compression — please pick a smaller file (under ~2MB original).` });
        return;
      }
      if (target === 'cover') {
        setDraft(p => ({ ...p, coverImage: compressed }));
      } else {
        if ((draft.gallery || []).length >= 6) {
          setMsg({ ok: false, text: 'Gallery is limited to 6 supporting images per article.' });
          return;
        }
        setDraft(p => ({ ...p, gallery: [...(p.gallery || []), compressed] }));
      }
      setMsg({ ok: true, text: `Image attached (~${kb}KB). Remember to save the article.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not process that image.' });
    } finally {
      setUploading(null);
    }
  };

  const save = async (publish: boolean) => {
    if (!draft.title.trim()) { setMsg({ ok: false, text: 'Please enter an article title.' }); return; }
    if (!draft.body.trim()) { setMsg({ ok: false, text: 'Please write the article body.' }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const now = new Date().toISOString();
      const existing = editingId ? articles.find(a => a.id === editingId) : undefined;
      const article: Article = {
        id: editingId || generateId(),
        slug: existing?.slug || slugify(draft.title),
        title: draft.title.trim(),
        excerpt: draft.excerpt.trim() || draft.body.split(/\n\s*\n/)[0]?.slice(0, 220) || '',
        category: draft.category.trim() || 'Newsroom',
        tags: draft.tags || [],
        coverImage: draft.coverImage || '',
        gallery: draft.gallery || [],
        body: draft.body,
        author: draft.author || settings.founderName,
        authorRole: draft.authorRole || settings.founderRole,
        published: publish,
        featured: !!draft.featured,
        readMinutes: Math.max(1, Math.round(draft.body.trim().split(/\s+/).length / 200)),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await saveArticleToCloud(article);
      const next = existing
        ? articles.map(a => (a.id === article.id ? article : a))
        : [article, ...articles];
      onArticlesChange(next);
      setMsg({ ok: true, text: publish ? `✓ "${article.title}" is live on the Articles page.` : `✓ Draft saved.` });
      reset();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const removeArticle = async (id: string) => {
    if (!confirm('Delete this article permanently? Its comments and likes will also be removed.')) return;
    setBusy(id);
    try {
      await deleteArticleFromCloud(id);
      onArticlesChange(articles.filter(a => a.id !== id));
      if (editingId === id) reset();
    } finally {
      setBusy(null);
    }
  };

  const togglePublish = async (a: Article) => {
    setBusy(a.id);
    try {
      const updated: Article = { ...a, published: !a.published, updatedAt: new Date().toISOString() };
      await saveArticleToCloud(updated);
      onArticlesChange(articles.map(x => (x.id === a.id ? updated : x)));
      // Newly published → email every active subscriber (premium template w/ cover)
      if (updated.published) {
        setNotifyLog('Emailing subscribers…');
        try {
          const subs = await fetchSubscribersOnce();
          const active = subs.filter(s => s.status !== 'unsubscribed');
          let sent = 0;
          for (const s of active) {
            try {
              const res = await sendWeb3Form(newArticleTemplate(updated, s.email, settings));
              if (res.ok) sent += 1;
            } catch { /* continue */ }
          }
          setNotifyLog(`✓ Release email sent to ${sent}/${active.length} subscribers.`);
        } catch {
          setNotifyLog('⚠ Publish succeeded, but subscriber emails could not be sent.');
        }
        setTimeout(() => setNotifyLog(null), 6000);
      }
    } finally {
      setBusy(null);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#C8862A] text-white transition-colors';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-[Space_Grotesk] font-bold text-xl text-white">📰 Articles &amp; Newsroom</h2>
          <p className="text-xs text-slate-400 mt-1">
            {articles.length} article{articles.length === 1 ? '' : 's'} · {articles.filter(a => a.published).length} live on the public Articles page
          </p>
        </div>
        {editingId && (
          <button onClick={reset} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl border border-slate-700 transition">
            ✕ Cancel editing
          </button>
        )}
      </div>

      {msg && (
        <p className={`rounded-xl border p-3.5 text-xs font-semibold ${msg.ok ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>
          {msg.text}
        </p>
      )}
      {notifyLog && (
        <p className="rounded-xl border border-[#C8862A]/25 bg-[#C8862A]/10 p-3.5 text-xs font-semibold text-[#E0B27A]">
          📧 {notifyLog}
        </p>
      )}

      {/* Editor */}
      <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-[Space_Grotesk] font-bold text-base text-[#C8862A]">
          {editingId ? '✏️ Edit article' : '✍️ Write new article'}
        </h3>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Headline *</label>
          <input type="text" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="e.g. 5 Pricing Mistakes Killing Nigerian Startups" className={inputCls} />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Category</label>
            <input type="text" value={draft.category} onChange={e => setDraft(p => ({ ...p, category: e.target.value }))} placeholder="Business Growth" className={inputCls} list="article-categories" />
            <datalist id="article-categories">
              <option value="Business Growth" /><option value="Sales & Marketing" /><option value="Branding" />
              <option value="Publishing News" /><option value="Founder Notes" /><option value="Opinion" />
            </datalist>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Author</label>
            <input type="text" value={draft.author} onChange={e => setDraft(p => ({ ...p, author: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Author role</label>
            <input type="text" value={draft.authorRole} onChange={e => setDraft(p => ({ ...p, authorRole: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Standfirst / Excerpt (shown on cards + emails)</label>
          <textarea rows={2} value={draft.excerpt} onChange={e => setDraft(p => ({ ...p, excerpt: e.target.value }))} placeholder="One or two sentences summarising the story…" className={inputCls} />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1 font-mono">Body * (blank line = new paragraph)</label>
          <textarea
            rows={12}
            value={draft.body}
            onChange={e => setDraft(p => ({ ...p, body: e.target.value }))}
            placeholder={"Write the story here.\n\nLeave an empty line between paragraphs.\n\nEach paragraph renders beautifully on the article page."}
            className={`${inputCls} font-[Inter] leading-relaxed`}
          />
          <p className="mt-1 font-mono text-[10px] text-slate-500">
            {draft.body.trim() ? `${draft.body.trim().split(/\s+/).length} words · ~${Math.max(1, Math.round(draft.body.trim().split(/\s+/).length / 200))} min read` : 'Start typing…'}
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">Tags (type + Enter)</label>
          <div className="flex flex-wrap gap-2">
            {(draft.tags || []).map(tag => (
              <span key={tag} className="inline-flex items-center gap-2 bg-[#C8862A]/12 text-[#C8862A] ring-1 ring-[#C8862A]/25 rounded-full pl-3 pr-1.5 py-1.5 text-xs font-semibold">
                {tag}
                <button type="button" onClick={() => setDraft(p => ({ ...p, tags: (p.tags || []).filter(t => t !== tag) }))} className="w-5 h-5 grid place-items-center rounded-full hover:bg-[#C8862A]/25 hover:text-white transition">✕</button>
              </span>
            ))}
            <input
              type="text" placeholder="+ add tag"
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = tagInput.trim().replace(/,+$/, '');
                  if (val && !(draft.tags || []).some(t => t.toLowerCase() === val.toLowerCase())) {
                    setDraft(p => ({ ...p, tags: [...(p.tags || []), val] }));
                  }
                  setTagInput('');
                }
              }}
              className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-[#C8862A] w-32"
            />
          </div>
        </div>

        {/* Cover image */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">Cover image (upload from this device)</label>
          <div className="flex items-center gap-4 flex-wrap">
            {draft.coverImage && <img src={draft.coverImage} alt="Cover preview" className="h-24 w-36 object-cover rounded-xl border border-slate-700 shadow" />}
            <div className="space-y-2">
              <label className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition border border-slate-700">
                {uploading === 'cover' ? 'Processing…' : draft.coverImage ? 'Replace cover' : 'Upload cover'}
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleImage(e, f, 'cover'); e.target.value = ''; }} />
              </label>
              {draft.coverImage && (
                <button type="button" onClick={() => setDraft(p => ({ ...p, coverImage: '' }))} className="block text-xs text-red-400 hover:underline">Remove cover</button>
              )}
              <p className="text-[11px] text-slate-500">Auto-compressed for fast loading on every browser.</p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-4">
          <label className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-mono">Supporting images — gallery (max 6)</label>
          {(draft.gallery || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {draft.gallery!.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt={`Gallery ${i + 1}`} className="h-20 w-28 object-cover rounded-lg border border-slate-700" />
                  <button type="button" onClick={() => setDraft(p => ({ ...p, gallery: (p.gallery || []).filter((_, j) => j !== i) }))}
                    className="absolute -top-2 -right-2 w-6 h-6 grid place-items-center rounded-full bg-red-600 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">✕</button>
                </div>
              ))}
            </div>
          )}
          <label className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition border border-slate-700">
            {uploading === 'gallery' ? 'Processing…' : '+ Add gallery image'}
            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void handleImage(e, f, 'gallery'); e.target.value = ''; }} />
          </label>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
          <input type="checkbox" checked={!!draft.featured} onChange={e => setDraft(p => ({ ...p, featured: e.target.checked }))} className="w-4 h-4 accent-[#C8862A]" />
          Feature this story at the top of the Articles page
        </label>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button onClick={() => void save(false)} disabled={saving} className="flex-1 min-w-[160px] bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs py-3.5 rounded-xl border border-slate-700 transition">
            {saving ? 'Saving…' : editingId ? 'Save changes (keep status)' : 'Save as draft'}
          </button>
          <button onClick={() => void save(true)} disabled={saving} className="flex-1 min-w-[160px] bg-[#C8862A] hover:bg-[#d8963a] disabled:opacity-50 text-slate-950 font-bold text-xs py-3.5 rounded-xl transition shadow-md">
            {saving ? 'Publishing…' : '🚀 Publish now'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">Publishing emails every subscriber automatically.</p>
      </section>

      {/* List */}
      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="text-center py-14 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
            <p className="text-3xl mb-2">📰</p>
            <p className="font-[Space_Grotesk] font-bold">No articles yet</p>
            <p className="text-xs text-slate-500 mt-1">Write your first story above — it appears on the Articles page once published.</p>
          </div>
        )}
        {sorted.map(a => (
          <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors">
            {a.coverImage
              ? <img src={a.coverImage} alt="" className="h-20 w-32 shrink-0 object-cover rounded-xl border border-slate-700" />
              : <div className="h-20 w-32 shrink-0 grid place-items-center rounded-xl bg-slate-900 border border-slate-800 font-[Space_Grotesk] text-2xl font-black text-[#C8862A]/50">N</div>
            }
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${a.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {a.published ? '● Live' : '○ Draft'}
                </span>
                {a.featured && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#C8862A]/20 text-[#C8862A]">★ Featured</span>}
                {a.category && <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{a.category}</span>}
              </div>
              <h4 className="mt-1.5 font-[Space_Grotesk] font-bold text-white text-[15px] leading-snug truncate">{a.title}</h4>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {new Date(a.updatedAt || a.createdAt).toLocaleDateString()} · {(a.gallery || []).length} image{(a.gallery || []).length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => startEdit(a)} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl border border-slate-700 transition">Edit</button>
              <button onClick={() => void togglePublish(a)} disabled={busy === a.id} className={`text-xs px-3.5 py-2 rounded-xl border transition disabled:opacity-50 ${a.published ? 'border-red-900/50 text-red-400 hover:bg-red-900/20' : 'border-emerald-900/50 text-emerald-400 hover:bg-emerald-900/20'}`}>
                {busy === a.id ? '…' : a.published ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={() => void removeArticle(a.id)} disabled={busy === a.id} className="text-xs px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-xl transition" title="Delete permanently">🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

}

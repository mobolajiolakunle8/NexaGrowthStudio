export default function Socials() {
  return (
    <div className="flex gap-3 pt-4">
      {/* WhatsApp share */}
      <button
        onClick={() => {
          const text = encodeURIComponent(
            `Check out "${document.title}" — a practical guide for Nigerian business owners by Nexa Growth Studio. ${window.location.origin}${window.location.pathname}`
          );
          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener');
        }}
        className="flex items-center gap-2 bg-[#25D366] text-white text-xs font-bold px-4 py-2.5 rounded-full hover:scale-105 transition"
      >
        💬 WhatsApp
      </button>

      {/* Native share */}
      <button
        onClick={async () => {
          if (navigator.share) {
            try { await navigator.share({ title: document.title, text: document.title, url: window.location.href }); } catch {}
          } else {
            const text = encodeURIComponent(`"${document.title}" – Nexa Growth Studio`);
            window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener');
          }
        }}
        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded-full transition"
      >
        🔗 Share
      </button>
    </div>
  );
}

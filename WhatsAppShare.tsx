import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
  message: string;
  label?: string;
  phone?: string; // Leave blank to let user select recipient
}

export function WhatsAppShare({ message, label = 'Share with a friend', phone }: Props) {
  const [sending, setSending] = useState(false);

  const openWhatsApp = () => {
    const encoded = encodeURIComponent(message);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSending(true);
    setTimeout(() => setSending(false), 10000); // Re-enable after 10s for usability
  };

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      disabled={sending}
      className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.13em] text-[#0E1420] hover:scale-[1.02] transition-transform disabled:opacity-50"
    >
      <MessageCircle size={15} />
      {sending ? 'Open WhatsApp…' : (label ?? 'Send via WhatsApp')}
    </button>
  );
}

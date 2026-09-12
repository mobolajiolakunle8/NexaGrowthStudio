import { useState } from 'react';
import { Mail } from 'lucide-react';

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'invalid' | 'failed'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setStatus('invalid');
      return;
    }
    setStatus('sending');
    try {
      // Dynamic import to keep the homepage light
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
      <div className="relative mt-8 mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-center">
        <p className="font-[Space_Grotesk] text-[16px] font-bold text-emerald-300">You're subscribed! 🎉</p>
        <p className="mt-1 font-[JetBrains_Mono] text-[10px] uppercase tracking-[0.14em] text-white/55">
          You'll be the first to know about new releases.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto mt-8 max-w-md" noValidate>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'sending'}
            className="w-full rounded-full border border-white/20 bg-white/5 pl-11 pr-4 py-3.5 font-mono text-[12.5px] text-white focus:border-[#C8862A] focus:outline-none placeholder:text-white/35 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded-full bg-[#C8862A] px-7 py-3.5 font-[JetBrains_Mono] text-[10.5px] font-bold uppercase tracking-[0.13em] text-[#0E1420] transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 shrink-0"
        >
          {status === 'sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
      {status === 'invalid' && (
        <p className="mt-3 text-xs text-red-400">Please enter a valid email address.</p>
      )}
      {status === 'failed' && (
        <p className="mt-3 text-xs text-red-400">Something went wrong. Please try again.</p>
      )}
      <p className="mt-4 font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] text-white/35">
        Zero spam. Unsubscribe anytime.
      </p>
    </form>
  );
}

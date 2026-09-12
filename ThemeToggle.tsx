import { Moon, Sun } from 'lucide-react';

interface Props {
  dark: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export default function ThemeToggle({ dark, onToggle, compact = false }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center justify-center gap-2 rounded-full border font-[JetBrains_Mono] font-bold uppercase tracking-[0.12em] transition-all ${
        compact ? 'h-9 w-9' : 'px-3.5 py-2 text-[9.5px]'
      } ${
        dark
          ? 'border-white/15 bg-white/[0.06] text-[#F8F3EA] hover:bg-white/10'
          : 'border-[#0E1420]/15 bg-white text-[#0E1420] hover:border-[#C8862A]'
      }`}
      aria-label={dark ? 'Use light mode' : 'Use dark mode'}
      title={dark ? 'Use light mode' : 'Use dark mode'}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      {!compact && <span>{dark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
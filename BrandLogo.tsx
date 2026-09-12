import type { SiteSettings } from '../types';

interface Props {
  settings: SiteSettings;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-11 w-11 rounded-2xl',
  lg: 'h-16 w-16 rounded-2xl',
};

export default function BrandLogo({ settings, size = 'md', dark = false, className = '' }: Props) {
  const sizeClass = sizes[size];

  if (settings.logoImage) {
    return (
      <span
        className={`${sizeClass} grid shrink-0 place-items-center overflow-hidden border shadow-sm ${
          dark ? 'border-white/15 bg-white' : 'border-[#0E1420]/10 bg-white'
        } ${className}`}
      >
        <img
          src={settings.logoImage}
          alt={`${settings.studioName} logo`}
          className="h-full w-full object-contain p-1"
        />
      </span>
    );
  }

  return (
    <span
      className={`${sizeClass} grid shrink-0 place-items-center font-[Space_Grotesk] font-black shadow-sm ${className}`}
      style={{ background: dark ? '#C8862A' : '#0E1420', color: dark ? '#0E1420' : '#C8862A' }}
      aria-label={`${settings.studioName} mark`}
    >
      N
    </span>
  );
}
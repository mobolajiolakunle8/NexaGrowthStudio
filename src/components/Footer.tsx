import type { SiteSettings } from '../types';
import BrandLogo from './BrandLogo';

interface Props {
  settings: SiteSettings;
  dark: boolean;
}

export default function Footer({ settings, dark }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className={`border-t ${dark ? 'border-white/10 bg-[#0A0F18]' : 'border-[#0E1420]/10 bg-[#F7F3EC]'}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-8 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-2.5">
          <BrandLogo settings={settings} dark={dark} size="sm" />
          <span className="leading-tight">
            <span className="block font-[Space_Grotesk] text-[14px] font-bold">{settings.studioName}</span>
            <span className={`block font-[JetBrains_Mono] text-[8px] uppercase tracking-[0.18em] ${dark ? 'text-white/40' : 'text-[#0E1420]/45'}`}>{settings.location}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href={`https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.13em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>
            WhatsApp
          </a>
          <a href={`mailto:${settings.officialEmail}`} className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.13em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>
            Email
          </a>
          {settings.generalBooksUrl && (
            <a href={settings.generalBooksUrl} target="_blank" rel="noreferrer" className={`font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.13em] no-underline transition-colors hover:text-[#C8862A] ${dark ? 'text-white/55' : 'text-[#0E1420]/55'}`}>
              {settings.generalBooksLabel || 'General Books'}
            </a>
          )}
        </div>

        <p className={`font-[JetBrains_Mono] text-[9.5px] tracking-wide ${dark ? 'text-white/35' : 'text-[#0E1420]/40'}`}>
          © {year} {settings.studioName}
        </p>
      </div>
    </footer>
  );
}

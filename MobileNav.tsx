import { useState } from 'react';
import type { SiteSettings } from '../types';
import BrandLogo from './BrandLogo';
import ThemeToggle from './ThemeToggle';
import { Menu, X } from 'lucide-react';

interface Props {
  settings: SiteSettings;
  navLinks: Array<[string, string, string]>; // [label, href, icon]
  currentPath?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function MobileNav({ settings, navLinks, currentPath = '/', theme, onToggleTheme }: Props) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <>
      {/* Mobile top-right menu trigger */}
      <div className="flex items-center gap-2 md:hidden">
        <ThemeToggle dark={theme === 'dark'} onToggle={onToggleTheme} compact />
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#0E1420]/20 bg-white text-[#0E1420] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C8862A] focus:ring-offset-2 hover:bg-[#FAF7F2] transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sliding Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={closeMenu}
          ></div>
          <div className={`absolute top-0 right-0 h-full w-[85%] max-w-[320px] bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? 'translate-x-0 animate-slide-in' : 'translate-x-full'
          }`}>
            <div className="flex h-full flex-col justify-between">
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-center justify-between mb-8">
                  <BrandLogo settings={settings} dark={false} size="sm" />
                  <span className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.2em] text-[#C8862A]/60">MENU</span>
                </div>
                <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.25em] text-[#C8862A] mb-6">Navigate</p>
                <nav className="space-y-1">
                  {navLinks.map(([label, href, icon]) => (
                    <a
                      key={label}
                      href={href}
                      onClick={closeMenu}
                      className={`flex items-center gap-4 rounded-xl px-4 py-3.5 font-[Space_Grotesk] text-[16px] font-bold transition-all ${
                        currentPath === href ? 'bg-[#C8862A]/10 text-[#C8862A]' : 'text-[#0E1420]/75 hover:bg-[#FAF7F2] hover:text-[#0E1420]'
                      }`}
                    >
                      <span className="font-[JetBrains_Mono] text-[15px]">{icon}</span>
                      <span>{label}</span>
                    </a>
                  ))}
                </nav>
              </div>

              <div className="border-t border-[rgba(14,20,32,0.08)] px-8 py-6">
                <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.22em] text-[#0E1420]/60 mb-4">Theme</p>
                <ThemeToggle dark={theme === 'dark'} onToggle={onToggleTheme} />
                {settings.generalBooksUrl && (
                  <a href={settings.generalBooksUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[#C8862A]/25 bg-[#C8862A]/10 px-4 py-3 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A6218] no-underline transition-colors hover:bg-[#C8862A]/15">
                    Browse General Books ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

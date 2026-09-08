import { useState } from 'react';
import { Star } from 'lucide-react';

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  location?: string;
  message: string;
  rating: number;
}

interface Props {
  testimonials?: Testimonial[];
  title?: string;
}

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 'sbsp1',
    name: 'Chinwe Okoro',
    role: 'Founder',
    location: 'Lagos, Nigeria',
    message: 'The Small Business Sales Book transformed how we close. I finally stopped discounting and clients respect the process.',
    rating: 5,
  },
  {
    id: 'sbsp2',
    name: 'Tunde Alao',
    role: 'Operations Manager',
    location: 'Ibadan, Nigeria',
    message: 'The preview chapters were actionable. I finished the book on Sunday; our team closed two new contracts on Monday.',
    rating: 5,
  },
];

export function Testimonials({ testimonials = DEFAULT_TESTIMONIALS, title = 'What Readers Say' }: Props) {
  const [index, setIndex] = useState(0);
  const active = testimonials[index] ?? testimonials[0];

  if (!active) return null;

  return (
    <section className="py-20 bg-[#F2EBDD] border-y border-[rgba(14,20,32,0.08)]">
      <div className="mx-auto max-w-5xl px-5 text-center">
        <p className="font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-[0.28em] text-[#C8862A] mb-5">Reader Trust</p>
        <h2 className="font-[Space_Grotesk] text-[28px] font-bold tracking-[-0.02em] text-[#0E1420] md:text-[38px] mb-10">
          {title}
        </h2>

        <div className="relative mx-auto max-w-2xl rounded-3xl bg-white p-8 md:p-10 shadow-xl border border-[rgba(14,20,32,0.08)]">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-[#C8862A] px-3 py-1 font-[JetBrains_Mono] text-[9px] font-bold uppercase tracking-wider text-[#0E1420]">
            Verified Order
          </div>

          <div className="flex justify-center gap-1 mb-5">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} size={16} className={star <= active.rating ? 'text-[#C8862A] fill-[#C8862A]' : 'text-[#0E1420]/20'} />
            ))}
          </div>

          <p className="text-[15px] md:text-[16px] leading-[1.75] text-[#0E1420]/85 italic font-medium">
            “{active.message}”
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-[rgba(14,20,32,0.08)] pt-6">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0E1420] font-[Space_Grotesk] font-bold text-[#C8862A] text-sm">OS</span>
            <div className="text-center sm:text-left">
              <p className="font-[Space_Grotesk] text-[13px] font-bold text-[#0E1420]">{active.name}</p>
              <p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.14em] text-[#0E1420]/50">
                {active.role && <>{active.role}</>}{active.role && active.location && <span className="mx-1.5">·</span>}{active.location}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIndex((index + 1) % testimonials.length)}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-[rgba(14,20,32,0.12)] bg-[#FAF7F2] px-4 py-2 font-[JetBrains_Mono] text-[10px] font-bold uppercase tracking-wider text-[#0E1420] hover:border-[#C8862A] transition-colors"
          >
            Next Reader Review →
          </button>
        </div>
      </div>
    </section>
  );
}

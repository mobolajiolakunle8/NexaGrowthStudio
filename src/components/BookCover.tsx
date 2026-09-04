import type { Book } from '../types';

interface Props {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  rotate?: boolean;
}

const sizes = {
  sm: { w: 'w-16', h: 'h-24', title: 'text-[10px]', author: 'text-[7px]', rule: 'w-4', price: 'text-[8px]', pad: 'p-2' },
  md: { w: 'w-[200px]', h: 'h-[284px]', title: 'text-[17px]', author: 'text-[8px]', rule: 'w-8', price: 'text-xs', pad: 'p-5' },
  lg: { w: 'w-[240px]', h: 'h-[340px]', title: 'text-[20px]', author: 'text-[9px]', rule: 'w-10', price: 'text-sm', pad: 'p-6' },
};

export default function BookCover({ book, size = 'md', className = '', rotate = false }: Props) {
  const s = sizes[size];

  // If book has a custom uploaded cover image, show it
  if (book.coverImage) {
    return (
      <img
        src={book.coverImage}
        alt={book.title}
        className={`${s.w} ${s.h} object-cover border-[1.5px] border-[#C9A227] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(13,24,48,0.45),0_4px_12px_rgba(13,24,48,0.2)] ${rotate ? 'rotate-[-3deg] hover:rotate-0' : ''} transition-transform duration-300 ${className}`}
      />
    );
  }

  // Generated CSS cover — works on every browser, no images needed
  return (
    <div
      className={`${s.w} ${s.h} bg-gradient-to-br from-[#152447] to-[#0D1830] border-[1.5px] border-[#C9A227] rounded-[6px] shadow-[0_24px_48px_-12px_rgba(13,24,48,0.45),0_4px_12px_rgba(13,24,48,0.2)] flex flex-col items-center justify-center ${s.pad} relative ${rotate ? 'rotate-[-3deg] hover:rotate-0' : ''} transition-transform duration-300 ${className}`}
    >
      {/* Inner border frame */}
      {size !== 'sm' && (
        <div className="absolute top-[10px] left-[10px] right-[10px] bottom-[10px] border border-[rgba(201,162,39,0.3)] rounded-[3px] pointer-events-none" />
      )}

      {/* Author kicker */}
      <span className={`font-[JetBrains_Mono] ${s.author} tracking-[1.2px] text-[#C9A227] uppercase mb-2 text-center leading-tight`}>
        {size === 'sm' ? '' : book.author}
      </span>

      {/* Title */}
      <h2 className={`font-[Space_Grotesk] font-bold ${s.title} text-white text-center leading-[1.2]`}>
        {size === 'sm' ? (
          <span className="line-clamp-3">{book.title}</span>
        ) : (
          book.title
        )}
      </h2>

      {/* Gold rule */}
      <div className={`${s.rule} h-[1.5px] bg-[#C9A227] my-2`} />

      {/* Bottom badge */}
      {book.type === 'paid' && book.payment ? (
        <span className={`bg-amber-500 text-slate-950 font-bold ${s.price} px-2 py-0.5 rounded-full`}>
          {book.payment.currency || '₦'}{book.payment.price?.toLocaleString()}
        </span>
      ) : (
        <span className={`font-[JetBrains_Mono] ${s.author} tracking-widest text-[#C9A227] uppercase`}>
          {size === 'sm' ? 'Free' : 'Free Guide'}
        </span>
      )}
    </div>
  );
}

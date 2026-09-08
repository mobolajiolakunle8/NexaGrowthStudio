interface Props {
  siteName: string;
  notice: string;
  onExit: () => void;
}

export default function DeveloperScreen({ siteName, notice, onExit }: Props) {
  return (
    <div className="grid min-h-screen place-items-center px-6 font-[Inter]" style={{ background: '#0E1420' }}>
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-2xl"
          style={{ background: 'rgba(200,134,42,0.15)' }}
        >
          🛠️
        </div>

        <p className="mt-6 font-[JetBrains_Mono] text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: '#C8862A' }}>
          Developer Mode Active
        </p>

        <h1 className="mt-4 font-[Space_Grotesk] text-[28px] font-bold leading-tight text-white md:text-[34px]">
          {siteName} is being upgraded.
        </h1>

        <p className="mt-4 text-[14.5px] leading-[1.7] text-white/65">{notice}</p>

        <div className="mt-9 flex flex-col gap-2.5">
          <button
            onClick={onExit}
            className="rounded-full px-6 py-3 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] transition-transform hover:scale-[1.02]"
            style={{ background: '#C8862A', color: '#0E1420' }}
          >
            ← Back to website
          </button>
          <a
            href="#/super"
            className="rounded-full border border-white/15 px-6 py-3 font-[JetBrains_Mono] text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 no-underline hover:bg-white/5 transition-colors"
          >
            Authorized access
          </a>
        </div>

        <p className="mt-8 font-[JetBrains_Mono] text-[9.5px] uppercase tracking-[0.18em] text-white/35">
          This website is temporarily restricted to the publisher.
        </p>
      </div>
    </div>
  );
}

import Image from 'next/image';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a9d73] text-white select-none">
      <div className="flex flex-col items-center animate-pulse duration-1000">
        {/* App Icon */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/30 border border-white/20">
          <Image
            src="/icon-512.png"
            alt="Prado Logo"
            fill
            sizes="(max-width: 640px) 96px, 112px"
            priority
            className="object-cover"
          />
        </div>

        {/* Brand Text */}
        <div className="mt-5 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Prado
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold tracking-widest text-emerald-100/90 uppercase">
            Field Operations
          </p>
        </div>

        {/* Subtle loading dots */}
        <div className="mt-8 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce"></span>
        </div>
      </div>
    </div>
  );
}

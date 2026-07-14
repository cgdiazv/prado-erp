'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import screen1 from '@/public/screen1.webp';
import screen2 from '@/public/screen2.webp';
import screen3 from '@/public/screen3.webp';

const screenshots = [
  {
    src: screen1,
    alt: 'Prado dashboard screenshot 1',
  },
  {
    src: screen2,
    alt: 'Prado dashboard screenshot 2',
  },
  {
    src: screen3,
    alt: 'Prado dashboard screenshot 3',
  },
];

export default function ScreenshotCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % screenshots.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full max-w-5xl rounded-[28px] border border-slate-800 bg-slate-900/40 p-3 shadow-2xl shadow-emerald-500/5 backdrop-blur-xs">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {screenshots.map((screenshot) => (
            <div key={screenshot.alt} className="relative min-w-full aspect-[16/8]">
              <Image
                src={screenshot.src}
                alt={screenshot.alt}
                fill
                priority={screenshot.alt === screenshots[0].alt}
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/70 to-transparent" />

        <button
          type="button"
          aria-label="Previous screenshot"
          onClick={() => setActiveIndex((activeIndex - 1 + screenshots.length) % screenshots.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-700/80 bg-slate-950/70 p-2 text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Next screenshot"
          onClick={() => setActiveIndex((activeIndex + 1) % screenshots.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-slate-700/80 bg-slate-950/70 p-2 text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {screenshots.map((screenshot, index) => (
            <button
              key={screenshot.alt}
              type="button"
              aria-label={`Show screenshot ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition ${
                activeIndex === index ? 'w-8 bg-emerald-400' : 'w-2.5 bg-slate-500/70 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
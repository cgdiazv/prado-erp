'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PhotoLightboxProps {
  photos: string[];
  isOpen: boolean;
  onClose: () => void;
  locale?: string;
  title?: string;
}

export default function PhotoLightbox({ photos, isOpen, onClose, locale = 'en', title }: PhotoLightboxProps) {
  const isEs = locale.toLowerCase().startsWith('es');
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') setIndex((prev) => (prev - 1 + count) % count);
      else if (event.key === 'ArrowRight') setIndex((prev) => (prev + 1) % count);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, count, onClose]);

  if (!isOpen || count === 0) return null;

  const safeIndex = Math.min(index, count - 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || (isEs ? 'Fotos del trabajo' : 'Job photos')}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={isEs ? 'Cerrar' : 'Close'}
        className="absolute right-4 top-4 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex w-full max-w-5xl items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
        {count > 1 && (
          <button
            type="button"
            onClick={() => setIndex((safeIndex - 1 + count) % count)}
            aria-label={isEs ? 'Foto anterior' : 'Previous photo'}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[safeIndex]}
          alt={isEs ? `Foto ${safeIndex + 1} de ${count}` : `Photo ${safeIndex + 1} of ${count}`}
          className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
        />

        {count > 1 && (
          <button
            type="button"
            onClick={() => setIndex((safeIndex + 1) % count)}
            aria-label={isEs ? 'Foto siguiente' : 'Next photo'}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-white/80" onClick={(e) => e.stopPropagation()}>
        <span>
          {safeIndex + 1} / {count}
        </span>
        <a
          href={photos[safeIndex]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          {isEs ? 'Abrir en tamaño completo' : 'Open full size'}
        </a>
      </div>
    </div>
  );
}

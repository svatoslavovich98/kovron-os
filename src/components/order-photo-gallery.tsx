"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function OrderPhotoGallery({ title, photos }: { title: string; photos: string[] }) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowLeft") setActive(value => value === null ? null : (value - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setActive(value => value === null ? null : (value + 1) % photos.length);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, photos.length]);

  if (!photos.length) return null;

  return (
    <>
      <div>
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <button key={`${photo}-${index}`} onClick={() => setActive(index)} className="aspect-[4/3] overflow-hidden rounded-md border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={`${title} ${index + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {active !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-3" onClick={() => setActive(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white" onClick={() => setActive(null)} aria-label="Закрыть"><X className="h-6 w-6" /></button>
          {photos.length > 1 && <button className="absolute left-3 sm:left-6 p-2 rounded-full bg-white/10 text-white" onClick={event => { event.stopPropagation(); setActive((active - 1 + photos.length) % photos.length); }}><ChevronLeft className="h-7 w-7" /></button>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[active]} alt={`${title} ${active + 1}`} className="max-h-[90dvh] max-w-[90vw] object-contain" onClick={event => event.stopPropagation()} />
          {photos.length > 1 && <button className="absolute right-3 sm:right-6 p-2 rounded-full bg-white/10 text-white" onClick={event => { event.stopPropagation(); setActive((active + 1) % photos.length); }}><ChevronRight className="h-7 w-7" /></button>}
          <span className="absolute bottom-4 text-xs text-white/75">{active + 1} из {photos.length}</span>
        </div>
      )}
    </>
  );
}

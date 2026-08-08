"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Ruler, X, Download, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

/**
 * Просмотр раскладки лекал во весь экран.
 * Открывается прямо из карточки заказа — не нужно листать фотографии.
 */
export function LayoutImageViewer({
  url,
  orderNumber,
  className,
}: {
  url?: string | null;
  orderNumber?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!url) {
    return (
      <Button variant="outline" className={cn("w-full", className)} disabled>
        <Ruler className="h-4 w-4 mr-2" />
        Раскладка не добавлена
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" className={cn("w-full", className)} onClick={() => setOpen(true)}>
        <Ruler className="h-4 w-4 mr-2" />
        Посмотреть лекала
      </Button>
      {open && (
        <LayoutImageOverlay url={url} orderNumber={orderNumber} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** Полноэкранный просмотр — используется и в карточке, и в списке заказов. */
export function LayoutImageOverlay({
  url,
  orderNumber,
  onClose,
}: {
  url: string;
  orderNumber?: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const setOpen = (v: boolean) => { if (!v) onClose(); };

  // На открытом просмотре страница не должна прокручиваться
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      {(
        <div className="fixed inset-0 z-[120] bg-black/92 flex flex-col">
          {/* Шапка */}
          <div className="flex items-center gap-2 p-3 text-white shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">Раскладка лекал</p>
              {orderNumber && <p className="text-xs text-white/60">Заказ №{orderNumber}</p>}
            </div>

            <button
              onClick={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))}
              disabled={zoom <= 1}
              className="p-2 rounded-md text-white/80 hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Уменьшить"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-xs tabular-nums text-white/60 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(4, +(z + 0.5).toFixed(1)))}
              disabled={zoom >= 4}
              className="p-2 rounded-md text-white/80 hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Увеличить"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2 rounded-md text-white/80 hover:bg-white/10 transition-colors"
              aria-label="Открыть оригинал"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-md text-white/80 hover:bg-white/10 transition-colors"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Картинка */}
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-3"
            onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="h-7 w-7 animate-spin text-white/60" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Раскладка лекал"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              onClick={() => setZoom(z => (z >= 4 ? 1 : +(z + 1).toFixed(1)))}
              style={{ transform: `scale(${zoom})` }}
              className="max-w-full max-h-full object-contain transition-transform duration-200 origin-center cursor-zoom-in select-none"
            />
          </div>

          <p className="p-3 text-center text-[11px] text-white/40 shrink-0">
            Нажмите на картинку, чтобы приблизить · Esc — закрыть
          </p>
        </div>
      )}
    </>
  );
}

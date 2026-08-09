"use client";

import { useEffect } from "react";
import { RotateCcw, Smartphone } from "lucide-react";

export function PortraitGuard() {
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!standalone) return;
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: "portrait-primary") => Promise<void>;
    };
    void orientation?.lock?.("portrait-primary").catch(() => undefined);
  }, []);

  return (
    <div className="portrait-guard" role="status" aria-live="polite">
      <div className="portrait-guard-card">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Smartphone className="h-7 w-7" />
          <RotateCcw className="h-5 w-5" />
        </div>
        <p className="mt-3 font-bold">Поверните телефон вертикально</p>
        <p className="mt-1 text-sm text-muted-foreground">KOVRON OS зафиксирован в удобном портретном режиме.</p>
      </div>
    </div>
  );
}

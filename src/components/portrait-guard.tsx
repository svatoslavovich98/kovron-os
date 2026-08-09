"use client";

import { useEffect } from "react";

export function PortraitGuard() {
  useEffect(() => {
    // Кэш файлов приложения. Без него Android качал всю сборку заново
    // при каждом запуске — на айфоне это скрывал собственный кэш Safari.
    // Кэшируются только неизменяемые файлы сборки, данные всегда свежие.
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: "portrait-primary") => Promise<void>;
    };
    void orientation?.lock?.("portrait-primary").catch(() => undefined);
  }, []);

  return null;
}

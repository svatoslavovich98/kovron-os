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

    // Облегчённый режим для слабых телефонов.
    // Считаем аппарат слабым, если у него мало памяти или ядер —
    // браузеры Android честно сообщают эти цифры. На iPhone таких
    // полей нет, и режим не включается, что и требуется.
    try {
      const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean; effectiveType?: string };
      };
      const memory = nav.deviceMemory;
      const cores = nav.hardwareConcurrency;
      const connection = nav.connection;

      const weak =
        (typeof memory === "number" && memory <= 4) ||
        (typeof cores === "number" && cores <= 4) ||
        connection?.saveData === true ||
        (connection?.effectiveType ? /2g|3g/.test(connection.effectiveType) : false);

      if (weak) document.documentElement.classList.add("lite-mode");
    } catch {
      /* Нет этих полей — значит и режим не нужен */
    }

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: "portrait-primary") => Promise<void>;
    };
    void orientation?.lock?.("portrait-primary").catch(() => undefined);
  }, []);

  return null;
}

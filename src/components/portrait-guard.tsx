"use client";

import { useEffect } from "react";

export function PortraitGuard() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
        registrations
          .filter(registration => registration.active?.scriptURL.endsWith("/sw.js"))
          .map(registration => registration.unregister()),
      )).catch(() => undefined);
    }

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (value: "portrait-primary") => Promise<void>;
    };
    void orientation?.lock?.("portrait-primary").catch(() => undefined);
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

const VIEWPORT_EVENT = "kovron:viewport-change";

export function ViewportSync() {
  useEffect(() => {
    let frame = 0;
    const timers = new Set<number>();

    const applyViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.round(window.innerHeight);
        const width = Math.round(window.innerWidth);
        document.documentElement.style.setProperty("--app-height", `${height}px`);
        document.documentElement.style.setProperty("--app-width", `${width}px`);
        window.scrollTo(0, 0);
        document.dispatchEvent(new CustomEvent(VIEWPORT_EVENT));
      });
    };

    const settleViewport = () => {
      applyViewport();
      [80, 220, 500].forEach(delay => {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          applyViewport();
        }, delay);
        timers.add(timer);
      });
    };

    applyViewport();
    window.addEventListener("resize", settleViewport);
    window.addEventListener("orientationchange", settleViewport);
    window.visualViewport?.addEventListener("resize", applyViewport);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(timer => window.clearTimeout(timer));
      window.removeEventListener("resize", settleViewport);
      window.removeEventListener("orientationchange", settleViewport);
      window.visualViewport?.removeEventListener("resize", applyViewport);
    };
  }, []);

  return null;
}

export { VIEWPORT_EVENT };

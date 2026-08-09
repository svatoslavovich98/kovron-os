// KOVRON OS — офлайн-кэш приложения.
//
// Задача: на Android приложение каждый запуск заново качало все файлы
// через сервер в Лондоне. Здесь мы кэшируем неизменяемые файлы сборки,
// но НИКОГДА не кэшируем данные и страницы — иначе можно увидеть
// устаревшие заказы и остатки по кассе.

const CACHE = "kovron-static-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Чистим кэши от прошлых версий
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Чужие домены не трогаем: база, хранилище фото, каталог лекал
  if (url.origin !== self.location.origin) return;

  const isBuildAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json";

  if (!isBuildAsset) return; // страницы и данные — всегда из сети

  // Файлы сборки имеют уникальные имена и не меняются,
  // поэтому берём из кэша сразу, а недостающее докачиваем
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const fallback = await caches.match(request);
        if (fallback) return fallback;
        throw error;
      }
    })()
  );
});

const CACHE_NAME = "kovron-os-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_NOTIFICATION") return;
  const payload = event.data.payload || {};
  event.waitUntil(self.registration.showNotification(payload.title || "KOVRON OS", {
    body: payload.body || "Новое уведомление",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    tag: payload.tag || "kovron-notification",
    renotify: false,
    data: { url: payload.url || "/dashboard" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});

const CACHE_NAME = "amazonia-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/admin.html",
  "/cadastro.html",
  "/css/style.css",
  "/css/pwa.css",
  "/css/admin.css",
  "/js/app.js",
  "/js/chatbot.js",
  "/js/tracker.js",
  "/js/admin.js",
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          if (event.request.mode === "navigate")
            return caches.match("/offline.html");
        })
      );
    }),
  );
});

var CACHE_NAME = "amazonia-v1";
var ASSETS = [
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

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k !== CACHE_NAME;
          })
          .map(function (k) {
            return caches.delete(k);
          }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return (
        cached ||
        fetch(event.request).catch(function () {
          if (event.request.mode === "navigate")
            return caches.match("/offline.html");
        })
      );
    }),
  );
});

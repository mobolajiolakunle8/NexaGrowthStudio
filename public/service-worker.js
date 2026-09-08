const CACHE_NAME = "nexa-studio-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS).catch(() => Promise.resolve())
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.claim().then(() =>
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});

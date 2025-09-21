const CACHE_NAME = "worktoolshub-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/views/index.html",
  "/styles/main.css",
  "/scripts/main.js",
  "/assets/icon-192.png",
  "/assets/icon-512.png"
];


// Install and cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Serve from cache, fallback to network
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return; // don’t cache POST/PUT/etc.

  event.respondWith(
    caches.match(event.request).then(resp =>
      resp || fetch(event.request).then(fetchResp => {
        // Optionally update cache
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResp.clone());
          return fetchResp;
        });
      })
    )
  );
});


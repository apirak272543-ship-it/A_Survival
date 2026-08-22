const SHELL_CACHE = "arcane-frontier-shell-v4";
const MAP_CACHE = "arcane-frontier-map-modules-v2";
const ART_CACHE = "arcane-frontier-art-v1";
const SHELL = ["/", "/manifest.webmanifest"];
const ACTIVE_CACHES = [SHELL_CACHE, MAP_CACHE, ART_CACHE];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("arcane-frontier-") && !ACTIVE_CACHES.includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put("/", response.clone());
    }
    return response;
  } catch {
    return (await caches.match("/")) || new Response("Offline", { status: 503 });
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/offline-map-modules/")) {
    event.respondWith(caches.open(MAP_CACHE).then(cache => cache.match(request).then(hit => hit || new Response("Not cached", { status: 404 }))));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (url.pathname.startsWith("/manus-storage/")) {
    event.respondWith(cacheFirst(request, ART_CACHE));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

self.addEventListener("sync", event => {
  if (event.tag !== "arcane-sync") return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type: "arcane-sync-request" }));
  }));
});

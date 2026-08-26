const SHELL_CACHE = "arcane-frontier-static-v2";
const MAP_CACHE = "arcane-frontier-map-modules-v3";
const ASSET_CACHE = "arcane-frontier-assets-v2";
const RUNTIME_CACHE = "arcane-frontier-runtime-v2";
const SHELL = ["/", "/manifest.webmanifest"];
const PACK_MANIFESTS = ["/assets/packs/arcane-frontier-voxel-pixel/manifest.json"];
const ACTIVE_CACHES = [SHELL_CACHE, MAP_CACHE, ASSET_CACHE, RUNTIME_CACHE];

self.addEventListener("install", event => {
  event.waitUntil(Promise.all([
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)),
    warmAssetPack(),
  ]).catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith("arcane-frontier-") && !ACTIVE_CACHES.includes(key)).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

async function warmAssetPack() {
  const cache = await caches.open(ASSET_CACHE);
  for (const manifestUrl of PACK_MANIFESTS) {
    try {
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) continue;
      await cache.put(manifestUrl, response.clone());
      const manifest = await response.json();
      const entries = Object.values(manifest.entries || {});
      await Promise.all(entries.map(async entry => {
        const assetUrl = new URL(entry.path, new URL("./", self.location.origin + manifestUrl)).toString();
        const assetResponse = await fetch(assetUrl, { cache: "no-store" });
        if (assetResponse.ok) await cache.put(assetUrl, assetResponse.clone());
      }));
    } catch {
      // The shell still installs when an optional pack is unavailable.
    }
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function cacheFirstWithRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request).then(response => {
    if (response.ok) return cache.put(request, response.clone()).then(() => response);
    return response;
  }).catch(() => hit || new Response("Offline asset unavailable", { status: 503 }));
  return hit || refresh;
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
    event.respondWith(cacheFirst(request, MAP_CACHE));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/manus-storage/")) {
    event.respondWith(cacheFirstWithRevalidate(request, ASSET_CACHE));
  }
});

self.addEventListener("sync", event => {
  if (event.tag !== "arcane-sync") return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    clients.forEach(client => client.postMessage({ type: "arcane-sync-request" }));
  }));
});

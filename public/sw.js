// BRÚJULA · Service Worker manual (pragmático) para PWA offline.
// Estrategias:
//   - navegación (páginas): network-first → cache → /offline
//   - /api/*: network-first → cache
//   - estáticos same-origin (_next/static, iconos): stale-while-revalidate
const VERSION = "brujula-v1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = [
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fb = await caches.match(fallbackUrl);
      if (fb) return fb;
    }
    return new Response("Sin conexión y sin datos guardados.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.status === 200) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached || (await network) || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Solo gestionamos same-origin; cross-origin (tiles, Supabase) pasa directo.
  if (!sameOrigin) return;

  // Navegación de páginas.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME, "/offline"));
    return;
  }

  // APIs internas.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME));
    return;
  }

  // Estáticos de Next + iconos + manifest.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(staleWhileRevalidate(request, SHELL));
    return;
  }

  // Resto: cache primero, luego red.
  event.respondWith(staleWhileRevalidate(request, RUNTIME));
});

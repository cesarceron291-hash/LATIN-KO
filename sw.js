/* LATINKO_CONTENIDO_NETWORK_V1 */
// El contenido compartido siempre va a la red; la app conserva su propio respaldo.
self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  if (url.pathname === '/contenido.json') {
    event.stopImmediatePropagation();
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
  } else if (url.origin === self.location.origin && event.request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.stopImmediatePropagation();
    event.respondWith((async function() {
      const cache = await caches.open('latinko-shell-sync-v1');
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (!response.ok) throw new Error('Página no disponible');
        try { await cache.put(event.request, response.clone()); } catch (_) {}
        return response;
      } catch (_) {
        return await cache.match(event.request) || await caches.match(event.request) || new Response('Sin conexión. Intenta de nuevo cuando tengas internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
  }
});
// Service Worker - Latin KO Promotions
// Versión del caché: sube este número cada vez que publiques cambios importantes
const CACHE_NAME = "latinko-cache-v1";

// Archivos base que se guardan para que la app cargue rápido / offline
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/images/icons/icon-192.png",
  "/images/icons/icon-512.png",
];

// Instalación: precachea lo esencial
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activación: limpia cachés viejas de versiones anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: network-first para HTML (para que la cartelera se actualice),
// cache-first para imágenes/estáticos (para velocidad)
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // No interceptar el stream de Kick ni llamadas externas: dejarlas pasar directo
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  const isHTML = request.mode === "navigate";

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    );
  } else {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  }
});

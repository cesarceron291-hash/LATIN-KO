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

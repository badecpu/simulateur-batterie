const CACHE_NAME = "battsim-cache-v7";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.4/chart.umd.min.js",
];

// Fichiers propres à l'app : toujours tenter le réseau en premier, pour que
// les mises à jour soient visibles immédiatement (plus besoin de rouvrir
// l'app deux fois). Le cache ne sert que de secours hors-ligne.
const NETWORK_FIRST_PATTERNS = [/index\.html$/, /app\.js$/, /style\.css$/, /manifest\.json$/, /\/$/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // Si un CDN est momentanément injoignable, on n'empêche pas l'installation.
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const isAppFile = NETWORK_FIRST_PATTERNS.some((re) => re.test(event.request.url));

  if (isAppFile) {
    // Réseau d'abord : la mise à jour est visible dès le premier chargement.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Ressources externes (CDN, icônes) : cache d'abord, pour la résilience hors-ligne.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

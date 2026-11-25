const CACHE = "family-income-v-20261124d";
const PRECACHE = /*PRECACHE_START*/["./","apple-touch-icon.png","favicon-16.png","favicon-32.png","favicon.ico","icon-192.png","icon-512.png","maskable-192.png","maskable-512.png","index.html","logo.svg","manifest.webmanifest"]/*PRECACHE_END*/;

const EXTRA_URLS = [
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
];

const RUNTIME_HOSTS = new Set(["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      await Promise.all(
        EXTRA_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { mode: "cors", credentials: "omit" });
            if (response && response.ok) await cache.put(url, response);
          } catch {
            // A CDN miss must not block install. The fetch handler caches it on the next visit.
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !RUNTIME_HOSTS.has(url.hostname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(self.registration.scope, copy)).catch(() => {});
          return response;
        })
        .catch(async () =>
          (await caches.match(self.registration.scope)) ||
          (await caches.match(new URL("index.html", self.registration.scope))) ||
          Response.error(),
        ),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        if (cached) return cached;
        throw error;
      }
    })(),
  );
});

const CACHE_NAME = "intellibus-ui-v9";
const APP_SHELL = [
  "./index.html",
  "./login.html",
  "./face-verification.html",
  "./permissions.html",
  "./engineering-student-dashboard.html",
  "./junior-student-dashboard.html",
  "./school-driver-dashboard.html",
  "./company-driver-dashboard.html",
  "./employee-dashboard.html",
  "./parent-dashboard.html",
  "./student-login.html",
  "./ui/driver-portal.html",
  "./ui/employee-login.html",
  "./ui/parent-login.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      const shellAssets = new Set();
      const shellPath = new URL("./", self.location.href).pathname;

      for (const page of APP_SHELL) {
        const pageUrl = new URL(page, self.location.href);
        const response = await cache.match(pageUrl);
        const html = await response.text();
        for (const [, reference] of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
          const assetUrl = new URL(reference, pageUrl);
          if (assetUrl.origin === self.location.origin && assetUrl.pathname.startsWith(shellPath)) {
            shellAssets.add(assetUrl.href);
          }
        }
      }

      await cache.addAll([...shellAssets]);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("intellibus-ui-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.endsWith("/assets/offline-config.js")) {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
          return response;
        }
        const cached = await caches.match(request);
        return cached || response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("Offline route configuration is not cached.");
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === "navigate" }).then((cached) => {
      if (cached) return cached;
      return fetch(request);
    }),
  );
});

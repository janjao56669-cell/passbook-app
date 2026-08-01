// APP_VERSION marker — bump this string on every release alongside index.html.
// The browser only detects a service worker "update" when this file's bytes
// change, so this line is what makes the in-app update banner fire at all.
const APP_VERSION = 'V1.6';
const CACHE_NAME = 'passbook-cache-' + APP_VERSION;
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  // NOTE: intentionally no self.skipWaiting() here — the new service worker
  // stays "waiting" until the user taps the update banner in index.html,
  // so an update never silently reloads the page while someone is mid-entry.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation, cache-first fallback for the app shell.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't intercept API calls to Vercel

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

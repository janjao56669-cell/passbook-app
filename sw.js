// APP_VERSION marker — bump this string on every release alongside index.html.
// BUILD_ID changes on every release too (even when APP_VERSION label stays the
// same) — this is what actually makes the browser detect a service worker
// update and fire the in-app "new version" banner.
const APP_VERSION = 'V1.9';
const BUILD_ID = '20261118153000';
const CACHE_NAME = 'passbook-cache-' + BUILD_ID;
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== 'passbook-share').map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation, cache-first fallback for the app shell.
// A picture shared into the app from the phone gallery (Android "Share" menu).
// The file is parked in a small cache and the page is opened to read it.
async function handleShare(request) {
  try {
    const fd = await request.formData();
    const f = fd.get('slip');
    if (f && f.size) {
      const c = await caches.open('passbook-share');
      await c.put(new URL('./shared-slip', self.registration.scope).href,
        new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }));
    }
  } catch (e) { /* the page will say it found nothing */ }
  return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // don't intercept API calls to Vercel
  if (event.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShare(event.request));
    return;
  }
  if (event.request.method !== 'GET') return;

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

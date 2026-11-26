// APP_VERSION marker — bump this string on every release alongside index.html.
// BUILD_ID changes on every release too (even when APP_VERSION label stays the
// same) — this is what actually makes the browser detect a service worker
// update and fire the in-app "new version" banner.
const APP_VERSION = 'V2.1';
const BUILD_ID = '20261126140000';
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
  let n = 0;
  try {
    const fd = await request.formData();
    const files = fd.getAll('slip').filter(f => f && f.size).slice(0, 12);
    const c = await caches.open('passbook-share');
    for (let i = 0; i < files.length; i++) {
      await c.put(new URL('./shared-slip-' + i, self.registration.scope).href,
        new Response(files[i], { headers: { 'Content-Type': files[i].type || 'image/jpeg' } }));
      n++;
    }
  } catch (e) { /* the page will say it found nothing */ }
  return Response.redirect(new URL('./?shared=' + (n || 1), self.registration.scope).href, 303);
}

// closed-app reminders: the worker sends an empty push, the text is fetched here (retry: the phone may be just waking up)
// shortcut: no 'pushsubscriptionchange' handler; the app re-registers on its next open, add one if phones go quiet
const PUSH_API = 'https://sweet-morning-e56c.janjao56669.workers.dev';
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let msgs = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      for (let i = 0; sub && i < 3; i++) {
        try { const r = await fetch(PUSH_API + '/pending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); msgs = (await r.json()).msgs || []; break; }
        catch (e) { await new Promise((res) => setTimeout(res, 1500 * (i + 1))); }
      }
    } catch (e) {}
    if (!msgs.length) msgs = [{ title: '🔔 บัญชีต้อการช่าง', body: 'มีเรื่องแจ้งเตือน แตะเพื่อเปิดแอป', tag: 'pb-push' }];
    for (const m of msgs) {
      await self.registration.showNotification(String(m.title || '🔔 บัญชีต้อการช่าง'), { body: String(m.body || ''), tag: m.tag || 'pb-push', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [180, 90, 180], data: { url: self.registration.scope } });
    }
  })());
});

// tapping a notification opens (or brings back) the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});

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

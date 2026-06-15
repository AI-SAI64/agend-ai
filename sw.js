const CACHE = 'agenda-ai-v1';
const FILES = ['/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  // Cache-first per file statici, network-first per API
  if (e.request.url.includes('googleapis') || e.request.url.includes('anthropic') || e.request.url.includes('accounts.google')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});

// Notifiche push programmate
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delay } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body, icon: '/icon-192.png', badge: '/icon-192.png',
        vibrate: [200, 100, 200], tag: 'agenda-reminder',
        actions: [{ action: 'open', title: 'Apri agenda' }]
      });
    }, delay);
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/index.html'));
});

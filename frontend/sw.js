const CACHE_NAME = 'neuralprep-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/planner.html',
  '/results.html',
  '/dashboard.html',
  '/login.html',
  '/style.css',
  '/mobile.css',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(r => r || new Response('Offline', {status: 503})))
  );
});

// Push notification handler
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'NeuralPrep', body: 'Time to study!' };
  e.waitUntil(self.registration.showNotification(data.title || 'NeuralPrep 📚', {
    body: data.body || 'Check your study plan!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'neuralprep-notif',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow('/'));
  }
});

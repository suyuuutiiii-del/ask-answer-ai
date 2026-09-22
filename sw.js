const CACHE = 'ask-get-answer-cloudflare-v6';
const SHELL = [
  '/', '/index.html', '/styles.css', '/teacher-studio.js', '/answer-renderer.js',
  '/illustrations.js', '/editor-mode.js', '/app.js', '/manifest.webmanifest', '/icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.url.includes('/api/')) return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        return response;
      })
      .catch(() => caches.match(request).then(response => response || (request.mode === 'navigate' ? caches.match('/index.html') : undefined)))
  );
});
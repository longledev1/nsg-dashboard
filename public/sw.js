// Service Worker cho PWA NSG Corporate Profile & Portal
const CACHE_NAME = 'nsg-portal-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo nsg.png',
  '/logo_nsg black.png',
  '/nsg-windmill.png',
  '/nsg-windmill-tower.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First for API & Data, Cache Fallback for Static Assets)
self.addEventListener('fetch', (event) => {
  // Chỉ cache các request GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Không cache request Supabase hoặc API bên ngoài
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Nếu fetch thành công, clone lưu vào cache cho các static assets
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Khi mất mạng, trả về cache đã lưu
        return caches.match(event.request);
      })
  );
});

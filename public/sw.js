// Service Worker cho PWA NSG Corporate Profile & Portal
const CACHE_NAME = 'nsg-portal-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/logo_nsg_black.png',
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

// Activate Event - Dọn dẹp cache cũ
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

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Chỉ xử lý các request GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // TUYỆT ĐỐI KHÔNG can thiệp các request API bên ngoài (Google Gemini AI, Supabase, Google Fonts...)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Không can thiệp các request nội bộ của Vite Dev server (HMR, modules, ...)
  if (
    url.pathname.startsWith('/@') || 
    url.pathname.includes('/node_modules/') || 
    url.pathname.startsWith('/rest/')
  ) {
    return;
  }

  // Xử lý request tài nguyên nội bộ: Network First, Fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Lưu cache các asset tĩnh cùng origin khi fetch thành công
        if (response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // 1. Thử tìm trong cache (bỏ qua query params như ?cat=...&folder=...)
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        // 2. Nếu là navigation request (tải trang HTML), trả về cache của trang chủ '/'
        if (event.request.mode === 'navigate') {
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
        }

        // 3. Fallback an toàn (tránh lỗi TypeError: Failed to convert value to 'Response')
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

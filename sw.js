/**
 * Service Worker for "Keeping up with the singularity"
 * Provides offline reading, background caching, and fast asset delivery.
 */

const CACHE_NAME = 'singularity-pwa-v2';

// Static core assets to pre-cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/category.html',
  '/article.html',
  '/o-autoru.html',
  '/style.css',
  '/style.css?v=20260823_1',
  '/js/theme.js?v=20260823_1',
  '/js/lang.js?v=20260823_1',
  '/js/main.js?v=20260823_1',
  '/js/category.js?v=20260823_1',
  '/js/article.js?v=20260823_1',
  '/js/pwa.js',
  '/articles.json',
  '/manifest.json',
  '/img/logo.png',
  '/img/icon.svg'
];

// Install event: Pre-cache core shell & articles data
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Apply intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin HTTP/HTTPS GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, attempt exact URL match in cache, or fallback to matching HTML shell
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          if (url.pathname.includes('article.html')) {
            return (await caches.match('/article.html')) || (await caches.match('/'));
          }
          if (url.pathname.includes('category.html')) {
            return (await caches.match('/category.html')) || (await caches.match('/'));
          }
          return (await caches.match('/index.html')) || (await caches.match('/'));
        })
    );
    return;
  }

  // 2. Data request (articles.json): Stale-While-Revalidate
  if (url.pathname.endsWith('articles.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Static assets (CSS, JS, Images, SVG): Cache-First with Network Fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});

// Shared Service Worker for all pages under /English/
const CACHE_NAME = 'english-v1';

// 缓存目录下所有已知页面和配套 manifest
const CORE_ASSETS = [
  '/English/Overview.html',
  '/English/overview-manifest.json',
  '/English/Fitness.html',
  "/English/Handful O'clock.html",
  '/English/Pocket.html',
  '/English/Role-play.html',
  '/English/Words.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // 逐个缓存，单个失败不影响整体
      return Promise.allSettled(
        CORE_ASSETS.map(function(url) { return cache.add(url); })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 有缓存：立即返回，后台静默更新
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(function() {});
        return cached;
      }
      // 无缓存：走网络，成功后存入缓存
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, response.clone());
        });
        return response;
      }).catch(function() {
        // 网络失败且是导航请求，尝试返回对应页面缓存
        if (event.request.mode === 'navigate') {
          return caches.match(event.request.url);
        }
      });
    })
  );
});

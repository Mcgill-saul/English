// Shared Service Worker - 部署在仓库根目录，scope 覆盖整站
const CACHE_NAME = 'english-v1';

const CORE_ASSETS = [
  '/English/Overview.html',
  '/English/overview-manifest.json',
  '/English/Fitness.html',
  '/English/fitness-manifest.json',
  "/English/Handful O'clock.html",
  "/English/handful-oclock-manifest.json",
  '/English/Pocket.html',
  '/English/Role-play.html',
  '/English/Words.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
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

  // 只处理同源请求：GitHub API（Gist 拉取/推送）、Google Fonts 等外部请求
  // 一律放行走网络，避免把"拉取最新数据"这类请求缓存成旧结果
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(function() {});
        return cached;
      }
      return fetch(event.request).then(function(response) {
        if (!response || response.status !== 200) return response;
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, response.clone());
        });
        return response;
      }).catch(function() {
        if (event.request.mode === 'navigate') {
          return caches.match(event.request.url);
        }
      });
    })
  );
});

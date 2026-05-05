// Smart Shuttle UNILORIN — Service Worker
// Caches HTML pages for faster loading and offline fallback

const CACHE_NAME = 'smart-shuttle-v1';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/bus-map/',
  '/bus-map/index.html',
  '/bus-map/buses.html',
  '/bus-map/driver.html',
  '/bus-map/manifest.json'
];

// Install — cache core files
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name)   { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — network first, fallback to cache
// This means live Firebase data always loads when online
// but the app shell still works offline
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests and Firebase/CDN requests
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Let Firebase, Leaflet, and CDN requests go straight to network
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('openstreetmap')
  ) {
    return;
  }

  // For our own HTML files: network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Update cache with fresh response
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        // Network failed — serve from cache
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // Ultimate fallback
          return caches.match('/bus-map/index.html');
        });
      })
  );
});

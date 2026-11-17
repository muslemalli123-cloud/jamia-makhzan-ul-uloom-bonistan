/* Jamia Makhzan-ul-Uloom Bonistan Panjgur — service worker.
   Makes the site installable as an app and usable offline.
   Pages are always fetched fresh from the network so new results and
   announcements are never stale; images, fonts and icons are cached. */
var CACHE = "jamia-v1";
var PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/monogram.jpg",
  "./assets/gallery-1.jpg",
  "./assets/gallery-2.jpg",
  "./assets/gallery-3.jpg",
  "./assets/gallery-4.jpg",
  "./assets/gallery-5.jpg",
  "./assets/gallery-6.jpg",
  "./assets/gallery-7.jpg",
  "./assets/gallery-8.jpg",
  "./assets/fonts/Amiri-400.ttf",
  "./assets/fonts/Amiri-700.ttf",
  "./assets/fonts/UL-Sajid-Heading-400.ttf",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-512-maskable.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // Pages: network first, so new content is never stale; offline falls back to cache.
  if (e.request.mode === "navigate" || url.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }
  // Same-origin files (images, fonts, icons): cache first, then network.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        if (hit) return hit;
        return fetch(e.request).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
          return res;
        });
      })
    );
  }
});

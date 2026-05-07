const CACHE_NAME = 'paper-io-v70';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './game.js',
    './manifest.json',
    './assets/menu_bg.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Cache-first for /assets/ folder (immutable assets)
    if (url.pathname.includes('/assets/')) {
        e.respondWith(
            caches.match(e.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(e.request).then(networkResponse => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Stale-While-Revalidate for HTML/JS/CSS
    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            const networkFetch = fetch(e.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                // If network fails, return cached response even if we don't have network to revalidate
            });

            return cachedResponse || networkFetch;
        })
    );
});

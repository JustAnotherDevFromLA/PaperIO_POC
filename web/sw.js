const CACHE_NAME = 'paper-io-v131';
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

function cleanResponse(response) {
    const clonedResponse = response.clone();
    const bodyPromise = 'body' in clonedResponse ?
        Promise.resolve(clonedResponse.body) :
        clonedResponse.blob();

    return bodyPromise.then((body) => {
        return new Response(body, {
            headers: clonedResponse.headers,
            status: clonedResponse.status,
            statusText: clonedResponse.statusText,
        });
    });
}

self.addEventListener('fetch', e => {
    if (!e.request.url.startsWith('http')) {
        return;
    }

    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).then(networkResponse => {
                if (networkResponse.redirected) {
                    return cleanResponse(networkResponse);
                }
                return networkResponse;
            }).catch(() => {
                return caches.match('./index.html');
            })
        );
        return;
    }

    if (e.request.url.includes('.mp3') || e.request.url.includes('.wav') || e.request.url.includes('.png')) {
        e.respondWith(
            caches.match(e.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(e.request).then(networkResponse => {
                    if (networkResponse.redirected) {
                        return cleanResponse(networkResponse).then(cleanRes => {
                            caches.open(CACHE_NAME).then(cache => cache.put(e.request, cleanRes.clone()));
                            return cleanRes;
                        });
                    }
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
                    return networkResponse;
                });
            })
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then(cachedResponse => {
            const networkFetch = fetch(e.request).then(networkResponse => {
                if (networkResponse.redirected) {
                    return cleanResponse(networkResponse).then(cleanRes => {
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, cleanRes.clone()));
                        return cleanRes;
                    });
                }
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse.clone()));
                return networkResponse;
            }).catch(() => {
                // If network fails, return cached response even if we don't have network to revalidate
            });

            return cachedResponse || networkFetch;
        })
    );
});

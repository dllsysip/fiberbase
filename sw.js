// Service Worker برای کار آفلاین (stale-while-revalidate)
const CACHE_NAME = 'fiberbase-v2.3.0';
const APP_SHELL = ['./', './index.html', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(req, { ignoreSearch: true });
            const network = fetch(req)
                .then((res) => {
                    if (res && (res.ok || res.type === 'opaque')) {
                        cache.put(req, res.clone());
                    }
                    return res;
                })
                .catch(() => null);

            if (cached) {
                event.waitUntil(network);
                return cached;
            }
            const fresh = await network;
            if (fresh) return fresh;
            if (req.mode === 'navigate') {
                const shell = await cache.match('./index.html');
                if (shell) return shell;
            }
            return Response.error();
        })
    );
});

// Service Worker برای کار آفلاین (stale-while-revalidate)
const CACHE_NAME = 'fiberbase-v2.3.4';
const APP_SHELL = ['./', './index.html', './manifest.json', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const CDN = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
    'https://unpkg.com/persian-datepicker@1.2.0/dist/css/persian-datepicker.min.css',
    'https://code.jquery.com/jquery-3.6.0.min.js',
    'https://unpkg.com/persian-date@1.1.0/dist/persian-date.min.js',
    'https://unpkg.com/persian-datepicker@1.2.0/dist/js/persian-datepicker.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // فایل‌های خود برنامه؛ خطا در یک فایل نصب را متوقف نمی‌کند
            await Promise.all(APP_SHELL.map((u) => cache.add(u).catch(() => {})));
            // کتابخانه‌های CDN در پس‌زمینه ذخیره می‌شوند و نصب را معطل نمی‌کنند
            event.waitUntil(Promise.all(CDN.map((u) =>
                fetch(u, { mode: 'no-cors' }).then((r) => cache.put(u, r)).catch(() => {}))));
        }).then(() => self.skipWaiting())
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

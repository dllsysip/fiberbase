const CACHE_NAME = 'fiberbase-v2.3.8';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/maskable-512.png',
    './icons/apple-touch-icon.png'
];

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
            // هر فایل جداگانه: اگر یکی خطا داد، نصب کامل شکست نخورد
            await Promise.all(APP_SHELL.map((u) => cache.add(u).catch(() => {})));
            // CDN در پس‌زمینه کش می‌شود (پاسخ opaque برای no-cors)
            CDN.forEach((u) => {
                fetch(new Request(u, { mode: 'no-cors' }))
                    .then((res) => cache.put(u, res))
                    .catch(() => {});
            });
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // stale-while-revalidate: نسخه کش‌شده فوری، و به‌روزرسانی در پس‌زمینه
    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(req, { ignoreSearch: true });
            const network = fetch(req)
                .then((res) => {
                    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
                    return res;
                })
                .catch(() => null);
            if (cached) {
                event.waitUntil(network);
                return cached;
            }
            const res = await network;
            return res || caches.match('./index.html');
        })
    );
});

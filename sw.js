// Service worker: la app funciona sin conexión (carcasa y fotos). Los datos de Supabase NUNCA se guardan aquí.
const C = 'kokorosd-v10';
const CORE = ['./', 'index.html', 'app.css', 'app.js', 'vendor/supabase.js', 'manifest.webmanifest',
              'icon-192.png', 'img/logo-white.png', 'img/logo-red.png'];
const IMG_HOSTS = ['cdn.jsdelivr.net', 'raw.githubusercontent.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const mine = u.origin === location.origin;
  const img = IMG_HOSTS.includes(u.hostname);
  if (!mine && !img) return;                       // Supabase, YouTube, fuentes… van directos a la red
  if (img) {                                       // fotos de ejercicios: caché primero
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
      return res;
    })));
    return;
  }
  e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => {  // propios: red primero, caché si no hay red
    if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});

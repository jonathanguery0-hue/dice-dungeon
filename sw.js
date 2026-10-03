// Service worker : met le jeu en cache pour qu'il fonctionne hors-ligne.
// Changer VERSION à chaque mise en ligne pour que les joueurs reçoivent la nouvelle version.
const VERSION = 'dice-dungeon-v7.0.0';
const FILES = ['./', './index.html', './manifest.webmanifest', './css/style.css',
  './js/data.js', './js/art.js', './js/engine.js', './js/ai.js', './js/store.js', './js/audio.js', './js/ui.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Réseau d'abord (mises à jour immédiates), cache si hors-ligne.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request)
    .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html'))));
});

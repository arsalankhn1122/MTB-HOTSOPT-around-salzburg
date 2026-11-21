// Service worker for the MTB Hotspots Salzburg app.
// The app opens even without internet: the dashboard (with all routes and photos) and the map library are kept on the phone.
// Map tiles, weather and directions still need internet.
const CACHE = 'mtb-salzburg-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js', 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // the dashboard itself: newest version when online, saved copy when offline
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // app files and the map library: saved copy first
  if (url.origin === location.origin || url.hostname === 'unpkg.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // everything else (map tiles, weather, directions) goes straight to the internet
});

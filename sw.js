// Service worker: sovellus toimii myös ilman verkkoa, ja päivitykset tulevat perille.
//
// - Sivu (index.html) haetaan aina ensin verkosta. Välimuistia käytetään vain, jos verkkoa ei ole.
//   Näin GitHubiin viety korjaus näkyy puhelimessa heti seuraavalla avauskerralla.
// - Kuvakkeet ja fontit haetaan välimuistista (ne eivät muutu).
// - Firebasen yhteyksiin ei kosketa. Firebasen kirjastot (versio 10.12.0) tallennetaan välimuistiin,
//   jotta sovellus aukeaa myös ilman verkkoa.
//
// Kun muutat kuvakkeita tai fontteja, nosta VERSIO-numeroa.
const VERSIO = 2;
const CACHE = `sanaristikot-v${VERSIO}`;
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.0/';
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'fonts/playfair-display-latin-700-normal.woff2',
  'fonts/playfair-display-latin-400-italic.woff2',
  'fonts/dm-sans-latin-300-normal.woff2',
  'fonts/dm-sans-latin-400-normal.woff2',
  'fonts/dm-sans-latin-500-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('sanaristikot-') && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebasen kirjastot: kiinteä versio, ei muutu → välimuistista
  if (req.url.startsWith(FIREBASE_SDK)) { e.respondWith(cacheFirst(req)); return; }

  // Muihin palvelimiin (Firestore, kirjautuminen) ei kosketa
  if (url.origin !== self.location.origin) return;

  // Sivu: ensin verkosta, ilman verkkoa välimuistista
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', copy));
        }
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  // Kuvakkeet, fontit, manifest
  e.respondWith(cacheFirst(req));
});

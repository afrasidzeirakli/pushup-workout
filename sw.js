// Service worker: აპი და კლიპები ოფლაინაც მუშაობს.
// ვერსია შეცვალე, როცა index.html-ს ან კლიპებს ცვლი.
const VERSION = 'v2';
const CORE = `core-${VERSION}`;
const MEDIA = 'media-v1';
const CLIPS = ['knee-pushaway','prowler-pushup','decline-pushups','knee-pushups','standard-pushup','archer-pushup-1',
  'incline-pushups','psuedo-planche','modified-hindu-pushup','twisting-knee-pushups','twisting-pushup','banded-crossover-pushups',
  'lateral-knee-plyo-pushups','double-hand-release-plyo-pushup','brock-shuffle-pushups','v-sit-hold','v-sit-scissor-hold','scissor-v-up']
  .map(n => `./clips/${n}.mp4`);
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CORE && k !== MEDIA).map(k => caches.delete(k)));
    await self.clients.claim();
    // კლიპები ფონურად იქეშება; თითო წარუმატებელი ჩატვირთვა ინსტალაციას არ აჩერებს
    const m = await caches.open(MEDIA);
    await Promise.allSettled(CLIPS.map(async u => { if (!(await m.match(u))) await m.add(u); }));
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // კლიპები და შრიფტები: ქეშიდან, თუ არ არის — ქსელიდან და ქეშში
  if (url.pathname.includes('/clips/') || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(caches.open(MEDIA).then(async c => {
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }).catch(() => caches.match(req)));
    return;
  }

  // აპის გვერდი: ჯერ ქსელი (რომ განახლება მოვიდეს), ვერ მოვიდა — ქეში
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(CORE).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
  }
});

// Meu Controle - Service Worker (offline)
const CACHE = 'meu-controle-v2';
const CORE = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let host = '';
  try { host = new URL(req.url).hostname; } catch (_) { return; }

  // Nunca interceptar Firebase (login + sincronizacao em tempo real precisam da rede)
  if (host.indexOf('firebaseio.com') !== -1 ||
      host.indexOf('firebasedatabase.app') !== -1 ||
      host.indexOf('identitytoolkit.googleapis.com') !== -1 ||
      host.indexOf('securetoken.googleapis.com') !== -1 ||
      host === 'www.googleapis.com') {
    return;
  }

  // Navegacao: rede primeiro (pega atualizacoes), cai pro cache se offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Estaticos (CDN, fontes): cache primeiro, depois rede
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} }).catch(() => {});
      return resp;
    }).catch(() => cached))
  );
});

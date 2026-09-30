// Bizu do Concurseiro X — service worker mínimo: permite instalar o app (PWA).
// Não guarda cache: tudo vem sempre da rede, então nunca há versão desatualizada.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

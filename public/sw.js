// Minimal service worker: it makes the site installable in more browsers. No fetch handler and no caching,
// so every request still goes to the network exactly as before.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

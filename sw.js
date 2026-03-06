// Service Worker is disabled.
// This file exists to satisfy any lingering browser registration attempts without causing errors.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('fetch', () => {
  // Pass through all requests directly to network
  return;
});
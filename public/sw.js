self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('FocinhoApp Service Worker Ativado');
});

self.addEventListener('fetch', (event) => {
  // Empty fetch handler allows the app to pass the PWA installability criteria
});

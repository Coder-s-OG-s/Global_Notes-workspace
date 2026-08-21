const CACHE_NAME = 'my-note-app-cache-v12';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.html',
  '/CSS/landing.css',
  '/CSS/index.css',
  '/CSS/signup.css',
  '/CSS/styles.css',
  '/CSS/student-hub.css',
  '/CSS/code-workspace.css',
  '/CSS/ui-designer.css',
  '/HTML/signup.html',
  '/HTML/student-hub.html',
  '/HTML/code-workspace.html',
  '/HTML/ui-designer.html',
  '/JS/vendor/lz-string.min.js',
  '/JS/vendor/qrcode.min.js',
  '/JS/aiAssistant.js',
  '/JS/audioRecorder.js',
  '/JS/authButtons.js',
  '/JS/authPage.js',
  '/JS/authService.js',
  '/JS/constants.js',
  '/JS/db.js',
  '/JS/eventHandlers.js',
  '/JS/exportImport.js',
  '/JS/filterSearchSort.js',
  '/JS/folderManager.js',
  '/JS/formattingToolbar.js',
  '/JS/geminiAPI.js',
  '/JS/layoutManager.js',
  '/JS/loginPage.js',
  '/JS/mailFeature.js',
  '/JS/mediaManager.js',
  '/JS/noteManager.js',
  '/JS/noteOperations.js',
  '/JS/notesApp.js',
  '/JS/profileManager.js',
  '/JS/renderer.js',
  '/JS/shapeManager.js',
  '/JS/sketchPad.js',
  '/JS/slashCommands.js',
  '/JS/storage.js',
  '/JS/studentHub.js',
  '/JS/codeWorkspace.js',
  '/JS/uiDesigner.js',
  '/JS/themeManager.js',
  '/JS/themePresets.js',
  '/JS/utilities.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting(); // Force activate new SW immediately
});

self.addEventListener('fetch', event => {
  // NETWORK FIRST STRATEGY (Critical for development/updates)
  // Try network first, fall back to cache if offline
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache API only supports GET requests with http/https scheme
        if (event.request.method === 'GET' && (event.request.url.startsWith('http://') || event.request.url.startsWith('https://'))) {
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache).catch(err => {
                console.warn('Cache put error:', err);
              });
            });
        }

        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

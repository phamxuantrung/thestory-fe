// src/sw.js — TheStory Custom Service Worker
// VitePWA sẽ inject __WB_MANIFEST vào đây khi build

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Precache tất cả assets (được inject bởi VitePWA khi build)
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Skip waiting để SW mới activate ngay lập tức
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ===================== PUSH NOTIFICATION =====================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: '💕 TheStory', body: event.data.text() };
  }

  const title = data.title || '💕 TheStory';
  const options = {
    body: data.body || '💌 Bạn có tin nhắn mới',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    data: { url: data.url || '/chat' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'thestory-message',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (self.location.origin) + (event.notification.data?.url || '/chat');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

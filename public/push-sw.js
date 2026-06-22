// push-sw.js — TheStory Push Notification Service Worker
// Được tích hợp vào sw.js chính bởi VitePWA qua importScripts

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

  const targetUrl = event.notification.data?.url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Nếu đang có tab/window mở app — focus vào đó
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Không có tab nào — mở tab mới
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

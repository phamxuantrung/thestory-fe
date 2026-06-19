self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Bạn có tin nhắn mới',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'The Story', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(event.notification.data.url) && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow(event.notification.data.url);
    })
  );
});

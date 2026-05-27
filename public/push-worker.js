self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: 'French Native',
      body: event.data ? event.data.text() : 'Novas imagens foram adicionadas.',
    };
  }

  const title = payload.title || 'French Native';
  const options = {
    body: payload.body || 'Novas imagens e legendas estao prontas para treinar.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-192x192.png',
    image: payload.image,
    tag: payload.tag || 'ai-images',
    renotify: true,
    data: {
      url: payload.url || '/game',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/game';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});

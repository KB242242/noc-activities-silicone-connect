self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const payload = event.data ? event.data.json() : {};
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      const notificationType = payload.data?.notificationType || 'default';
      const isCallNotification = notificationType === 'call' || payload.title?.toLowerCase().includes('appel') || payload.title?.toLowerCase().includes('invitation');

      // Always notify all open tabs to ring (even background tabs)
      if (isCallNotification && clientsList.length > 0) {
        for (const client of clientsList) {
          client.postMessage({
            type: 'INCOMING_CALL_RING',
            payload: payload.data || {},
          });
        }
      }

      const hasVisibleClient = clientsList.some((client) => client.visibilityState === 'visible');
      if (hasVisibleClient) {
        return;
      }

      await self.registration.showNotification(payload.title || 'NOC Activities', {
        body: payload.body || 'Nouvelle notification',
        tag: payload.tag || ('noc-' + Date.now()),
        badge: '/robots.txt',
        requireInteraction: isCallNotification,
        silent: false,
        actions: isCallNotification
          ? [
              { action: 'accept', title: '✓ Accepter', icon: '/robots.txt' },
              { action: 'reject', title: '✗ Rejeter', icon: '/robots.txt' },
            ]
          : [],
        data: payload.data || { url: '/', notificationType: 'default' },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const notificationData = event.notification.data || { url: '/' };
      const baseUrl = notificationData.url || '/';
      const params = new URLSearchParams();

      if (notificationData.notificationType) {
        params.set('notificationType', String(notificationData.notificationType));
      }
      if (notificationData.callId) {
        params.set('callId', String(notificationData.callId));
      }
      if (notificationData.conversationId) {
        params.set('conversationId', String(notificationData.conversationId));
      }
      if (notificationData.fromUserId) {
        params.set('fromUserId', String(notificationData.fromUserId));
      }
      if (notificationData.fromUserName) {
        params.set('fromUserName', String(notificationData.fromUserName));
      }
      if (notificationData.callMediaType) {
        params.set('callMediaType', String(notificationData.callMediaType));
      }
      if (notificationData.isConferenceInvite) {
        params.set('isConferenceInvite', String(notificationData.isConferenceInvite));
      }
      if (event.action) {
        params.set('pushAction', event.action);
      }

      const targetUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('notificationaction', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus();
        }
        
        client.postMessage({
          type: 'CALL_ACTION',
          action: event.action,
          callId: notificationData.callId,
          conversationId: notificationData.conversationId,
          fromUserId: notificationData.fromUserId,
          fromUserName: notificationData.fromUserName,
        });
      }
    })()
  );
});
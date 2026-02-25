/* global importScripts, firebase, clients */
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Handle data-only messages
  const data = payload.data || {};
  const notificationTitle = data.title || payload.notification?.title || "New Message";
  const notificationBody = data.body || payload.notification?.body || "You have a new message";

  const notificationOptions = {
    body: notificationBody,
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-64x64.png",
    data: {
      link: data.link || "/",
      ...data
    },
    // Use unique tag to prevent duplicates
    tag: data.messageId || data.channelId || `notification-${Date.now()}`,
    renotify: false,
    // For call notifications, require interaction
    requireInteraction: data.type === "call",
    // Add vibration pattern for calls
    vibrate: data.type === "call" ? [200, 100, 200, 100, 200, 100, 200] : [200, 100, 200],
    // Add actions for call notifications
    actions: data.type === "call" ? [
      { action: "answer", title: "Answer", icon: "/pwa-64x64.png" },
      { action: "reject", title: "Reject", icon: "/pwa-64x64.png" }
    ] : []
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};

  // Handle action buttons
  if (event.action === "answer") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        const url = notificationData.link || "/";

        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            // Send message to accept the call
            client.postMessage({
              type: "ACCEPT_CALL",
              callData: {
                roomName: notificationData.roomName,
                callerId: notificationData.callerId,
                callerName: notificationData.callerName,
                mode: notificationData.mode
              }
            });
            return;
          }
        }

        if (clients.openWindow) {
          const callUrl = `${url}?acceptCall=true&roomName=${encodeURIComponent(notificationData.roomName)}&callerId=${notificationData.callerId}&callerName=${encodeURIComponent(notificationData.callerName || 'Caller')}&mode=${notificationData.mode}`;
          return clients.openWindow(callUrl);
        }
      })
    );
  } else if (event.action === "reject") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clientList) => {
        // Step 1: notify any open clients immediately via postMessage so the
        // in-app UI updates right away (handled by navigator.serviceWorker listener).
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.postMessage({
              type: "REJECT_CALL",
              callData: {
                roomName: notificationData.roomName,
                callerId: notificationData.callerId
              }
            });
          }
        }

        // Step 2: call the backend HTTP endpoint directly if backendUrl is available.
        // Note: .catch() only catches network errors, NOT 4xx/5xx – we must check
        // response.ok explicitly so a misconfigured URL doesn't silently swallow
        // the rejection.
        const backendUrl = notificationData.backendUrl;
        if (backendUrl) {
          try {
            const response = await fetch(`${backendUrl}/api/calls/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                roomName: notificationData.roomName,
                callerId: notificationData.callerId
              })
            });
            if (response.ok) return;
            console.warn("[SW] Backend HTTP reject returned non-OK status:", response.status);
          } catch (error) {
            console.error("[SW] HTTP reject request failed:", error);
          }
        }

        // Step 3 (fallback): HTTP path is unavailable or failed.
        // Open the app with ?rejectCall=true so the socket layer can notify
        // the caller. Only needed when no client window is already open.
        const hasOpenClient = clientList.some(c => c.url.includes(self.location.origin));
        if (!hasOpenClient && clients.openWindow) {
          const rejectUrl = `${self.location.origin}?rejectCall=true` +
            `&roomName=${encodeURIComponent(notificationData.roomName)}` +
            `&callerId=${encodeURIComponent(notificationData.callerId)}`;
          return clients.openWindow(rejectUrl);
        }
      })
    );
  } else {
    // If it's a call notification, treat body click as answer
    if (notificationData.type === "call") {
      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          const url = notificationData.link || "/";

          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && "focus" in client) {
              client.focus();
              client.postMessage({
                type: "ACCEPT_CALL",
                callData: {
                  roomName: notificationData.roomName,
                  callerId: notificationData.callerId,
                  callerName: notificationData.callerName,
                  mode: notificationData.mode
                }
              });
              return;
            }
          }

          if (clients.openWindow) {
            const callUrl = `${url}?acceptCall=true&roomName=${encodeURIComponent(notificationData.roomName)}&callerId=${notificationData.callerId}&callerName=${encodeURIComponent(notificationData.callerName || 'Caller')}&mode=${notificationData.mode}`;
            return clients.openWindow(callUrl).catch(() => clients.openWindow(url));
          }
        })
      );
    } else {
      // Default action - open the app
      event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
          const url = notificationData.link || "/";

          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && "focus" in client) {
              client.focus();
              client.postMessage({ type: "NAVIGATE", url });
              return;
            }
          }

          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
      );
    }
  }
});

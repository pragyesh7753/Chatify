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
  
  // Handle action buttons
  if (event.action === "answer") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        const url = event.notification.data.link || "/";
        
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url });
            return;
          }
        }
        
        // Open new window if not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  } else if (event.action === "reject") {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        const url = event.notification.data.link || "/";
        
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.postMessage({ type: "NAVIGATE", url });
            return;
          }
        }
        
        // Open new window if not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

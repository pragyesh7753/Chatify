import admin from "firebase-admin";

let fcmInitialized = false;

export const initializeFCM = () => {
  if (fcmInitialized) return;

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    fcmInitialized = true;
    console.log("FCM initialized successfully");
  } catch (error) {
    console.error("FCM initialization failed:", error.message);
  }
};

export const sendPushNotification = async (token, { title, body, data = {}, link }) => {
  if (!fcmInitialized) return;

  try {
    // Send data-only message to avoid duplicate notifications
    // The service worker will handle displaying the notification
    await admin.messaging().send({
      token,
      data: {
        ...data,
        title,
        body,
        link: link || process.env.FRONTEND_URL || "/",
        icon: "/pwa-192x192.png",
        badge: "/pwa-64x64.png"
      }
    });
  } catch (error) {
    console.error("Push notification failed:", error.message);
  }
};

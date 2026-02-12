import admin from "firebase-admin";
import logger from "./logger.js";

let fcmInitialized = false;

export const initializeFCM = () => {
  if (fcmInitialized) return;

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    fcmInitialized = true;
    logger.info("FCM initialized successfully");
  } catch (error) {
    logger.error("FCM initialization failed", { error: error.message });
  }
};

export const sendPushNotification = async (token, { title, body, data = {}, link }) => {
  if (!fcmInitialized) {
    logger.warn("FCM not initialized, cannot send push notification");
    return;
  }

  try {
    logger.info("Attempting to send push notification", {
      title,
      tokenPreview: `${token.substring(0, 20)}...`
    });

    // Convert all data values to strings (FCM requirement)
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) {
        stringifiedData[key] = '';
      } else if (typeof value === 'string') {
        stringifiedData[key] = value;
      } else {
        stringifiedData[key] = JSON.stringify(value);
      }
    }

    // Build final payload
    const payload = {
      ...stringifiedData,
      title: String(title || ''),
      body: String(body || ''),
      link: String(link || process.env.FRONTEND_URL || "/"),
      icon: "/pwa-192x192.png",
      badge: "/pwa-64x64.png"
    };

    // Log payload for debugging
    logger.info("FCM payload data", {
      payload,
      dataTypes: Object.entries(payload).map(([k, v]) => `${k}: ${typeof v}`)
    });

    // Send data-only message to avoid duplicate notifications
    // The service worker will handle displaying the notification
    const result = await admin.messaging().send({
      token,
      data: payload
    });

    logger.info("Push notification sent successfully", {
      messageId: result,
      title
    });
  } catch (error) {
    logger.error("Push notification failed", {
      error: error.message,
      code: error.code,
      title
    });
    throw error;
  }
};

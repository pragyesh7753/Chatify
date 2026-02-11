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
    
    // Send data-only message to avoid duplicate notifications
    // The service worker will handle displaying the notification
    const result = await admin.messaging().send({
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

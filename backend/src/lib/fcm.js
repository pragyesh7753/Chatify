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
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          icon: "/pwa-192x192.png",
          badge: "/pwa-64x64.png"
        },
        fcmOptions: {
          link: link || process.env.FRONTEND_URL || "/"
        }
      }
    });
  } catch (error) {
    console.error("Push notification failed:", error.message);
  }
};

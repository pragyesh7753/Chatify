import { useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { requestNotificationPermission, onMessageListener } from "../lib/firebase";
import { axiosInstance } from "../lib/axios";

export const useFCM = () => {
  const { mutate: saveFCMToken } = useMutation({
    mutationFn: async (token) => {
      const { data } = await axiosInstance.post("/fcm/token", { token });
      return data;
    }
  });

  const setupFCM = useCallback(async () => {
    const token = await requestNotificationPermission();
    if (token) {
      saveFCMToken(token);
    }
  }, [saveFCMToken]);

  useEffect(() => {
    setupFCM();

    // Handle foreground messages
    onMessageListener().then((payload) => {
      const data = payload.data || {};
      const title = data.title || payload.notification?.title;
      const body = data.body || payload.notification?.body;
      
      // Only show notification if app is not in focus
      if (document.visibilityState !== "visible" && title && body) {
        new Notification(title, {
          body,
          icon: data.icon || "/pwa-192x192.png",
          tag: data.messageId || data.channelId || `notification-${Date.now()}`
        });
      } else {
        console.log("Foreground message received:", payload);
      }
    }).catch((err) => console.error("Message listener error:", err));

    return () => {
      // Cleanup if needed
    };
  }, [setupFCM]);
};

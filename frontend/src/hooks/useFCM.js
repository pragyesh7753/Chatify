import { useEffect, useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { requestNotificationPermission, onMessageListener } from "../lib/firebase";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useFCM = () => {
  const [permissionState, setPermissionState] = useState(null);

  const { mutate: saveFCMToken } = useMutation({
    mutationFn: async (token) => {
      const { data } = await axiosInstance.post("/fcm/token", { token });
      return data;
    }
  });

  const setupFCM = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermissionState(result.permission);
    
    if (result.token) {
      saveFCMToken(result.token);
    } else if (result.permission === 'denied') {
      toast.error(
        'Notification permission denied. You won\'t receive message notifications.',
        { duration: 5000, id: 'fcm-permission-denied' }
      );
    } else if (result.permission === 'unsupported') {
      console.log('Notifications not supported in this browser');
    } else if (result.error) {
      console.error('Notification setup error:', result.error);
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

  return { permissionState };
};

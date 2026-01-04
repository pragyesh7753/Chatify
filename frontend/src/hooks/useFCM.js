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

    onMessageListener().then((payload) => {
      if (document.visibilityState === "visible") {
        console.log("Foreground message received:", payload);
      }
    }).catch((err) => console.error("Message listener error:", err));
  }, [setupFCM]);
};

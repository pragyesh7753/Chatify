import { saveFCMTokenService, removeFCMTokenService } from "../services/fcm.service.js";

export const saveFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.$id;

    await saveFCMTokenService(userId, token);

    res.json({ message: "FCM token saved" });
  } catch (error) {
    console.error("Save FCM token error:", error);
    res.status(500).json({ message: "Failed to save FCM token" });
  }
};

export const removeFCMToken = async (req, res) => {
  try {
    const userId = req.user.$id;

    await removeFCMTokenService(userId);

    res.json({ message: "FCM token removed" });
  } catch (error) {
    console.error("Remove FCM token error:", error);
    res.status(500).json({ message: "Failed to remove FCM token" });
  }
};

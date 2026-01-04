import { 
  createChannel, 
  getChannelById, 
  getUserChannels, 
  createMessage, 
  getChannelMessages 
} from "../services/message.service.js";
import { getIO, isUserOnline } from "../lib/socket.js";
import { getFCMTokenService } from "../services/fcm.service.js";
import { sendPushNotification } from "../lib/fcm.js";

export async function getChannels(req, res) {
  try {
    const userId = req.user._id;
    const channels = await getUserChannels(userId);

    res.status(200).json(channels);
  } catch (error) {
    console.log("Error in getChannels controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createOrGetChannel(req, res) {
  try {
    const { targetUserId } = req.body;
    const userId = req.user._id;

    // Create channel ID by sorting user IDs to ensure consistency
    const channelId = [userId, targetUserId].sort().join("-");
    const members = [userId, targetUserId];

    const channel = await createChannel(channelId, members);

    res.status(200).json(channel);
  } catch (error) {
    console.log("Error in createOrGetChannel controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const messages = await getChannelMessages(channelId, limit, offset);

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { channelId, text, attachments } = req.body;
    const user = req.user;

    const messageData = {
      channelId,
      senderId: user._id,
      senderName: user.fullName,
      text,
      attachments: attachments || []
    };

    const message = await createMessage(messageData);

    // Emit the message to all users in the channel (including sender for other devices)
    const io = getIO();
    io.to(channelId).emit("new-message", { 
      message, 
      senderId: user._id 
    });

    // Send push notification to offline recipient (with small delay to avoid race condition)
    const members = channelId.split("-");
    const recipientId = members.find(id => id !== user._id);
    
    setTimeout(async () => {
      if (recipientId && !isUserOnline(recipientId)) {
        try {
          const fcmToken = await getFCMTokenService(recipientId);
          if (fcmToken) {
            await sendPushNotification(fcmToken, {
              title: user.fullName,
              body: text || "Sent a message",
              data: {
                channelId,
                senderId: user._id,
                link: `/chat/${user._id}`
              }
            });
            console.log(`[FCM] Notification sent to ${recipientId}`);
          }
        } catch (error) {
          console.error("[FCM] Error:", error.message);
        }
      }
    }, 1000);

    res.status(201).json(message);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
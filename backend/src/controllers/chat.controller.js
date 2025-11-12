import { 
  createChannel, 
  getChannelById, 
  getUserChannels, 
  createMessage, 
  getChannelMessages 
} from "../services/message.service.js";
import { getIO } from "../lib/socket.js";

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
      senderImage: user.profilePic,
      text,
      attachments: attachments || []
    };

    const message = await createMessage(messageData);

    // Emit the message to all connected clients in the channel EXCEPT the sender
    // The sender will add the message optimistically from the response
    const io = getIO();
    io.to(channelId).emit("new-message", { message, senderId: user._id });

    res.status(201).json(message);
  } catch (error) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
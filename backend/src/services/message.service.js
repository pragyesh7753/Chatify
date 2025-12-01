import { databases, DATABASE_ID, Query } from "../lib/appwrite.js";
import { ID } from "node-appwrite";

const MESSAGES_COLLECTION_ID = process.env.APPWRITE_MESSAGES_COLLECTION_ID;
const CHANNELS_COLLECTION_ID = process.env.APPWRITE_CHANNELS_COLLECTION_ID;

export const createChannel = async (channelId, members) => {
  try {
    // Check if channel already exists
    const existingChannels = await databases.listDocuments(
      DATABASE_ID,
      CHANNELS_COLLECTION_ID,
      [Query.equal("channelId", channelId)]
    );

    if (existingChannels.documents.length > 0) {
      return existingChannels.documents[0];
    }

    // Create new channel
    const channel = await databases.createDocument(
      DATABASE_ID,
      CHANNELS_COLLECTION_ID,
      ID.unique(),
      {
        channelId,
        members,
        lastMessageAt: new Date().toISOString()
      }
    );

    return channel;
  } catch (error) {
    console.error("Error creating channel:", error);
    throw error;
  }
};

export const getChannelById = async (channelId) => {
  try {
    const channels = await databases.listDocuments(
      DATABASE_ID,
      CHANNELS_COLLECTION_ID,
      [Query.equal("channelId", channelId)]
    );

    return channels.documents[0] || null;
  } catch (error) {
    console.error("Error getting channel:", error);
    throw error;
  }
};

export const getUserChannels = async (userId) => {
  try {
    const channels = await databases.listDocuments(
      DATABASE_ID,
      CHANNELS_COLLECTION_ID,
      [
        Query.contains("members", userId),
        Query.orderDesc("lastMessageAt"),
        Query.limit(100)
      ]
    );

    return channels.documents;
  } catch (error) {
    console.error("Error getting user channels:", error);
    throw error;
  }
};

export const createMessage = async (messageData) => {
  try {
    const message = await databases.createDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      ID.unique(),
      {
        channelId: messageData.channelId,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        text: messageData.text,
        attachments: messageData.attachments || []
      }
    );

    // Update channel's last message timestamp
    const channel = await getChannelById(messageData.channelId);
    if (channel) {
      await databases.updateDocument(
        DATABASE_ID,
        CHANNELS_COLLECTION_ID,
        channel.$id,
        {
          lastMessageAt: new Date().toISOString()
        }
      );
    }

    return message;
  } catch (error) {
    console.error("Error creating message:", error);
    throw error;
  }
};

export const getChannelMessages = async (channelId, limit = 50, offset = 0) => {
  try {
    const messages = await databases.listDocuments(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      [
        Query.equal("channelId", channelId),
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );

    // Reverse to get chronological order (oldest first)
    return messages.documents.reverse();
  } catch (error) {
    console.error("Error getting channel messages:", error);
    throw error;
  }
};

export const deleteMessage = async (messageId) => {
  try {
    await databases.deleteDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      messageId
    );
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

export const updateMessage = async (messageId, text) => {
  try {
    const message = await databases.updateDocument(
      DATABASE_ID,
      MESSAGES_COLLECTION_ID,
      messageId,
      {
        text,
        isEdited: true
      }
    );

    return message;
  } catch (error) {
    console.error("Error updating message:", error);
    throw error;
  }
};

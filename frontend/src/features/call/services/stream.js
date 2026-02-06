import { StreamVideoClient } from "@stream-io/video-react-sdk";
import { axiosInstance } from "@/shared/lib/axios";

/**
 * Stream Video Client Manager
 * 
 * Handles initialization and cleanup of Stream Video client for audio/video calls.
 * This module manages the client lifecycle and provides utility functions.
 * 
 * How Stream Video works in Chatify:
 * 1. User initiates a call from chat UI
 * 2. Frontend requests token from backend (/api/stream/token)
 * 3. Backend generates user-specific token using Stream API secret
 * 4. Frontend creates StreamVideoClient with token
 * 5. Both users join same call using callId = "chatify-" + chatId
 * 6. Stream handles all WebRTC, STUN/TURN, and media
 * 7. Frontend just renders Stream components with custom styling
 */

let streamClientInstance = null;

/**
 * Initialize Stream Video client for the current user
 * 
 * @param {string} userId - Chatify user ID
 * @param {string} userName - User's display name
 * @param {string} userImage - User's avatar URL (optional)
 * @returns {Promise<StreamVideoClient>} Initialized Stream client
 * 
 * This function:
 * - Fetches a secure token from backend
 * - Creates StreamVideoClient instance
 * - Stores client for reuse during session
 */
export async function initializeStreamClient(userId, userName, userImage = null) {
  try {
    if (streamClientInstance) {
      return streamClientInstance;
    }

    // Fetch Stream token from backend
    // Backend generates token using Stream API secret (never exposed to frontend)
    const response = await axiosInstance.post("/stream/token");
    const { token, apiKey } = response.data.data;

    if (!token || !apiKey) {
      throw new Error("Invalid token response from server");
    }

    // Create Stream Video client
    // This client will be used for all call operations
    const client = new StreamVideoClient({
      apiKey: apiKey,
      user: {
        id: userId,
        name: userName,
        image: userImage || undefined,
      },
      token: token,
    });

    streamClientInstance = client;
    return client;
  } catch (error) {
    console.error("Failed to initialize Stream client:", error);
    throw new Error("Failed to initialize video client: " + error.message);
  }
}

/**
 * Get the current Stream client instance
 * 
 * @returns {StreamVideoClient | null} Current client or null
 */
export function getStreamClient() {
  return streamClientInstance;
}

/**
 * Disconnect and cleanup Stream client
 * 
 * Should be called:
 * - When user logs out
 * - Before creating new client
 * - On app cleanup/unmount
 */
export async function disconnectStreamClient() {
  if (streamClientInstance) {
    try {
      await streamClientInstance.disconnectUser();
      streamClientInstance = null;
    } catch (error) {
      console.error("Error disconnecting Stream client:", error);
      streamClientInstance = null;
    }
  }
}

/**
 * Create or join a Stream call
 * 
 * @param {string} chatId - The Chatify chat ID
 * @param {string} type - Call type: "default" for both audio and video
 * @returns {Promise<Call>} Stream Call instance
 * 
 * callId derivation:
 * - Uses format: "chatify-{chatId}"
 * - chatId is deterministic (sorted user IDs)
 * - Both users generate same callId
 * - Ensures they join the same Stream call room
 */
export async function createCall(chatId, type = "default") {
  const client = getStreamClient();
  
  if (!client) {
    throw new Error("Stream client not initialized. Call initializeStreamClient first.");
  }

  const callId = `chatify-${chatId}`;
  const call = client.call(type, callId);
  
  return call;
}

/**
 * Join a Stream call with specified options
 * 
 * @param {Call} call - Stream Call instance
 * @param {Object} options - Join options
 * @param {boolean} options.audioEnabled - Enable microphone on join
 * @param {boolean} options.videoEnabled - Enable camera on join
 * @returns {Promise<void>}
 * 
 * Audio vs Video mode:
 * - Audio call: { audioEnabled: true, videoEnabled: false }
 * - Video call: { audioEnabled: true, videoEnabled: true }
 */
export async function joinCall(call, { audioEnabled = true, videoEnabled = false } = {}) {
  try {
    await call.join({
      create: true,
      data: {
        settings: {
          audio: { mic_default_on: audioEnabled },
          video: { camera_default_on: videoEnabled },
        },
      },
    });
    
    // Set initial device states
    if (!audioEnabled) {
      await call.microphone.disable();
    }
    if (!videoEnabled) {
      await call.camera.disable();
    }
    
  } catch (error) {
    console.error("Error joining call:", error);
    throw error;
  }
}

/**
 * Leave a Stream call and cleanup
 * 
 * @param {Call} call - Stream Call instance to leave
 * @returns {Promise<void>}
 */
export async function leaveCall(call) {
  try {
    if (call) {
      await call.leave();
    }
  } catch (error) {
    console.error("Error leaving call:", error);
  }
}

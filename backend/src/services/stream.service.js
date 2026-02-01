import { StreamClient } from "@stream-io/node-sdk";

/**
 * Stream Video Service
 * 
 * Handles generation of Stream user tokens for video/audio calling.
 * Stream tokens allow authenticated Chatify users to join Stream calls
 * without exposing API secrets to the frontend.
 */

// Initialize Stream client with API key and secret from environment
// These credentials must NEVER be exposed to the frontend
const streamClient = new StreamClient(
  process.env.STREAM_API_KEY,
  process.env.STREAM_API_SECRET
);

export const StreamService = {
  /**
   * Generate a Stream user token for a given user
   * 
   * @param {string} userId - Chatify user ID (must match Stream user ID)
   * @param {string} userName - User's full name for display in Stream
   * @param {string} userImage - User's avatar URL (optional)
   * @returns {Promise<string>} Stream user token
   * 
   * How it works:
   * 1. Token is generated using Stream API key + secret (backend only)
   * 2. Token is valid for the specific userId
   * 3. Frontend uses this token to initialize StreamVideoClient
   * 4. Token expires after a set time (Stream handles this)
   * 
   * Security:
   * - API secret never leaves backend
   * - Token is user-specific and cannot be used by another user
   * - Token is generated on-demand (not stored)
   */
  async generateUserToken(userId, userName, userImage = null) {
    try {
      // Create user token with userId
      // This token allows the user to connect to Stream Video
      const token = streamClient.createToken(userId);
      
      return {
        token,
        userId,
        userName,
        userImage,
        apiKey: process.env.STREAM_API_KEY
      };
    } catch (error) {
      console.error("Error generating Stream token:", error);
      throw new Error("Failed to generate Stream token");
    }
  },

  /**
   * Get Stream client instance
   * For server-side operations if needed in the future
   */
  getClient() {
    return streamClient;
  }
};

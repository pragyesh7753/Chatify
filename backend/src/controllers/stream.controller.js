import { StreamService } from "../services/stream.service.js";

/**
 * Stream Token Controller
 * 
 * Handles HTTP requests for Stream video calling tokens.
 * Requires authentication - user must be logged in to get a token.
 */

export const generateStreamToken = async (req, res) => {
  try {
    // User is already authenticated via protectRoute middleware
    // req.user contains the authenticated user's data
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({ 
        message: "Unauthorized - User not found" 
      });
    }

    // Generate Stream token for this user
    // userId must match the Chatify user ID for call routing
    const tokenData = await StreamService.generateUserToken(
      user._id,
      user.fullName,
      user.avatar || null
    );

    // Return token and user info to frontend
    res.status(200).json({
      success: true,
      data: tokenData
    });

  } catch (error) {
    console.error("Error in generateStreamToken:", error);
    res.status(500).json({ 
      message: "Failed to generate Stream token",
      error: error.message 
    });
  }
};

import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { generateStreamToken } from "../controllers/stream.controller.js";

const router = express.Router();

/**
 * POST /api/stream/token
 * 
 * Generate a Stream Video user token for the authenticated user.
 * 
 * Authentication: Required (protectRoute middleware)
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     token: "eyJhbG...",
 *     userId: "user123",
 *     userName: "John Doe",
 *     userImage: "https://...",
 *     apiKey: "stream_api_key"
 *   }
 * }
 */
router.post("/token", protectRoute, generateStreamToken);

export default router;

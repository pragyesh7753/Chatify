import express from "express";
import { getIO, getConnectedUsers } from "../lib/socket.js";
import logger from "../lib/logger.js";

const router = express.Router();

/**
 * POST /api/calls/reject
 * Handle call rejection from service worker when app is closed
 */
router.post("/reject", async (req, res) => {
    try {
        const { roomName, callerId } = req.body;

        if (!roomName || !callerId) {
            return res.status(400).json({ error: "Missing roomName or callerId" });
        }

        const io = getIO();
        const connectedUsers = getConnectedUsers();

        // Get caller's socket ID
        const callerSocketId = connectedUsers.get(callerId);

        if (callerSocketId) {
            // Send rejection to caller
            io.to(callerSocketId).emit("call-rejected", {
                roomName,
                reason: "rejected"
            });

            logger.info("Call rejected from service worker", { roomName, callerId });
        } else {
            logger.warn("Caller not online when rejecting call from service worker", { callerId });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        logger.error("Error handling call rejection from service worker", {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

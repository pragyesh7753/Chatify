import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getFCMTokenService } from "../services/fcm.service.js";
import { sendPushNotification } from "./fcm.js";
import { databases, DATABASE_ID, Query } from "./appwrite.js";
import logger from "./logger.js";

const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;

let io;

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

// Store pending call rejection timeouts: { roomName: timeoutId }
const pendingCallTimeouts = new Map();

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'https://chatify.studio',
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:4173'
        ];

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.warn('Socket connection rejected: No token provided', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error("Authentication error"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.info("Socket connection rejected: Token expired", { socketId: socket.id });
      } else {
        logger.warn("Socket authentication failed", {
          socketId: socket.id,
          error: error.message
        });
      }
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    logger.info("User connected via Socket.io", { userId: socket.userId, socketId: socket.id });

    // Store the connected user
    connectedUsers.set(socket.userId, socket.id);

    // Emit online status to all connected clients
    io.emit("user-online", { userId: socket.userId });

    // Join personal room for direct messages
    socket.join(socket.userId);

    // Handle joining a chat channel
    socket.on("join-channel", (channelId) => {
      socket.join(channelId);
      logger.debug("User joined channel", { userId: socket.userId, channelId });
    });

    // Handle leaving a chat channel
    socket.on("leave-channel", (channelId) => {
      socket.leave(channelId);
      logger.debug("User left channel", { userId: socket.userId, channelId });
    });

    // Handle sending a message
    socket.on("send-message", (data) => {
      const { channelId, message } = data;
      // Broadcast the message to all users in the channel except sender
      socket.to(channelId).emit("new-message", message);
    });

    // Handle typing indicator
    socket.on("typing-start", (data) => {
      const { channelId, userId, userName } = data;
      socket.to(channelId).emit("user-typing", { userId, userName });
    });

    socket.on("typing-stop", (data) => {
      const { channelId, userId } = data;
      socket.to(channelId).emit("user-stopped-typing", { userId });
    });

    // Handle call events
    socket.on("call-invite", async (data) => {
      const { roomName, mode, targetUserId, caller } = data;
      const targetSocketId = connectedUsers.get(targetUserId);

      logger.info("Call invite received", {
        roomName,
        mode,
        targetUserId,
        callerId: caller._id,
        targetOnline: !!targetSocketId
      });

      if (targetSocketId) {
        // User is online, send call invite via socket
        io.to(targetSocketId).emit("call-invite", { roomName, mode, caller });
        logger.info("Call invite sent to online user via socket", { targetUserId });
      } else {
        // User is offline, send push notification
        logger.info("User is offline, attempting to send push notification", { targetUserId });

        try {
          const fcmToken = await getFCMTokenService(targetUserId);

          logger.info("FCM token retrieved", {
            targetUserId,
            hasToken: !!fcmToken,
            tokenPreview: fcmToken ? `${fcmToken.substring(0, 20)}...` : null
          });

          if (fcmToken) {
            const callType = mode === "video" ? "Video" : "Audio";

            logger.info("Sending push notification for call", {
              targetUserId,
              callType,
              callerName: caller.fullName
            });

            await sendPushNotification(fcmToken, {
              title: `Incoming ${callType} Call`,
              body: `${caller.fullName} is calling you`,
              link: process.env.FRONTEND_URL || "https://chatify.com",
              data: {
                type: "call",
                callerId: caller._id,
                callerName: caller.fullName,
                roomName,
                mode,
                backendUrl: process.env.BACKEND_URL
              }
            });

            logger.info("Push notification sent successfully for missed call", {
              targetUserId,
              callerId: caller._id
            });
          } else {
            logger.warn("No FCM token found for offline user", { targetUserId });
          }
        } catch (error) {
          logger.error("Failed to send push notification for call", {
            error: error.message,
            stack: error.stack,
            targetUserId
          });
        }

        // Delay before sending call-rejected to give time for push notification
        // delivery and user response (30 seconds to allow for notification delays)
        const timeoutId = setTimeout(async () => {
          socket.emit("call-rejected", { roomName, reason: "offline" });
          logger.info("Call rejected sent to caller after delay", { roomName });

          // Send missed call notification
          try {
            const fcmToken = await getFCMTokenService(targetUserId);

            if (fcmToken) {
              const callType = mode === "video" ? "Video" : "Audio";

              await sendPushNotification(fcmToken, {
                title: `Missed ${callType} Call`,
                body: `You missed a ${callType.toLowerCase()} call from ${caller.fullName}`,
                link: process.env.FRONTEND_URL || "https://chatify.com",
                data: {
                  type: "missed_call",
                  callerId: caller._id,
                  callerName: caller.fullName,
                  callType: mode,
                  timestamp: new Date().toISOString()
                }
              });

              logger.info("Missed call notification sent", {
                targetUserId,
                callerId: caller._id,
                callType
              });
            }
          } catch (error) {
            logger.error("Failed to send missed call notification", {
              error: error.message,
              targetUserId
            });
          }

          pendingCallTimeouts.delete(roomName);
        }, 30000); // 30 second delay

        // Store timeout ID so we can cancel it if call is accepted
        pendingCallTimeouts.set(roomName, timeoutId);
      }
    });

    socket.on("call-accepted", (data) => {
      const { roomName, targetUserId } = data;

      logger.info("Call accepted event received", { roomName, targetUserId });

      // Cancel pending rejection timeout if exists
      if (pendingCallTimeouts.has(roomName)) {
        clearTimeout(pendingCallTimeouts.get(roomName));
        pendingCallTimeouts.delete(roomName);
        logger.info("Cancelled pending call rejection timeout", { roomName });
      } else {
        logger.warn("No pending timeout found for accepted call", { roomName });
      }

      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-accepted", { roomName });
        logger.info("Call accepted notification sent to caller", { targetUserId });
      } else {
        logger.warn("Caller not found when sending call-accepted", { targetUserId });
      }
    });

    socket.on("call-rejected", async (data) => {
      const { roomName, targetUserId, reason } = data;

      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-rejected", {
          roomName,
          reason: reason || "rejected"
        });
      }
    });

    socket.on("call-cancelled", (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-cancelled", { roomName: data.roomName });
      }
    });

    socket.on("call-ended", (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-ended", { roomName: data.roomName });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);

      // Emit offline status to all connected clients
      io.emit("user-offline", { userId: socket.userId });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const getConnectedUsers = () => connectedUsers;

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

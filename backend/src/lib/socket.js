import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getFCMTokenService } from "../services/fcm.service.js";
import { sendPushNotification } from "./fcm.js";
import { databases, DATABASE_ID, Query } from "./appwrite.js";

const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;

let io;

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function(origin, callback) {
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
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      // Handle expired tokens gracefully (expected behavior, not an error)
      if (error.name === 'TokenExpiredError') {
        console.log("Socket connection rejected: Token expired (client will refresh and reconnect)");
        return next(new Error("Authentication error: Token expired"));
      }
      
      // Log other authentication errors
      console.error("Socket authentication error:", error.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Store the connected user
    connectedUsers.set(socket.userId, socket.id);
    
    // Emit online status to all connected clients
    io.emit("user-online", { userId: socket.userId });

    // Join personal room for direct messages
    socket.join(socket.userId);

    // Handle joining a chat channel
    socket.on("join-channel", (channelId) => {
      socket.join(channelId);
      console.log(`User ${socket.userId} joined channel ${channelId}`);
    });

    // Handle leaving a chat channel
    socket.on("leave-channel", (channelId) => {
      socket.leave(channelId);
      console.log(`User ${socket.userId} left channel ${channelId}`);
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
    socket.on("call-invite", (data) => {
      const { roomName, mode, targetUserId, caller } = data;
      const targetSocketId = connectedUsers.get(targetUserId);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-invite", { roomName, mode, caller });
      } else {
        socket.emit("call-rejected", { roomName, reason: "offline" });
      }
    });

    socket.on("call-accepted", (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-accepted", { roomName: data.roomName });
      }
    });

    socket.on("call-rejected", (data) => {
      const targetSocketId = connectedUsers.get(data.targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call-rejected", { 
          roomName: data.roomName, 
          reason: data.reason || "rejected" 
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

export const getConnectedUsers = () => {
  return Array.from(connectedUsers.keys());
};

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

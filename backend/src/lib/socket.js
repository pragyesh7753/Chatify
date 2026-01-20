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

    // Handle video call events
    socket.on("call-user", async (data) => {
      const { to, from, offer, channelId, callType } = data;
      const recipientSocketId = connectedUsers.get(to);
      
      // Get caller info
      let callerName = "Someone";
      let callerAvatar = null;
      try {
        const callerDocs = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
          Query.equal("$id", from)
        ]);
        
        if (callerDocs.documents.length > 0) {
          callerName = callerDocs.documents[0].fullName;
          callerAvatar = callerDocs.documents[0].profilePic;
        }
      } catch (error) {
        console.error("Error fetching caller info:", error);
      }
      
      if (recipientSocketId) {
        // User is online, send via socket
        io.to(recipientSocketId).emit("incoming-call", {
          from,
          offer,
          channelId,
          callType,
          callerName,
          callerAvatar
        });
      } else {
        // User is offline or app is in background, send push notification
        try {
          const fcmToken = await getFCMTokenService(to);
          
          if (fcmToken) {
            await sendPushNotification(fcmToken, {
              title: `Incoming ${callType === "voice" ? "Voice" : "Video"} Call`,
              body: `${callerName} is calling you`,
              data: {
                type: "call",
                callType,
                from,
                channelId,
                offer: JSON.stringify(offer),
                callerName,
                callerAvatar: callerAvatar || ""
              },
              link: `/call/${from}?channelId=${channelId}&callType=${callType}&userName=${encodeURIComponent(callerName)}`
            });
            
            console.log(`Push notification sent to ${to} for ${callType} call`);
          }
        } catch (error) {
          console.error("Error sending call notification:", error);
        }
      }
    });

    socket.on("call-answer", (data) => {
      const { to, answer } = data;
      const recipientSocketId = connectedUsers.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call-answered", { answer });
      }
    });

    socket.on("ice-candidate", (data) => {
      const { to, candidate } = data;
      const recipientSocketId = connectedUsers.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("ice-candidate", { candidate });
      }
    });

    socket.on("end-call", (data) => {
      const { to } = data;
      const recipientSocketId = connectedUsers.get(to);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("call-ended");
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

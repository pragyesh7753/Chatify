import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getFCMTokenService } from "../services/fcm.service.js";
import { sendPushNotification } from "./fcm.js";
import { databases, DATABASE_ID, Query } from "./appwrite.js";

const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID;

let io;

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

// Store active calls: { callId: { callerId, receiverId, status } }
const activeCalls = new Map();

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

    // ==================== WebRTC Signaling Events ====================
    
    // Handle call initiation
    socket.on("call-user", ({ to, callType, callerInfo }) => {
      const receiverSocketId = connectedUsers.get(to);
      
      if (!receiverSocketId) {
        // Receiver is offline
        socket.emit("call-failed", { reason: "User is offline" });
        return;
      }

      const callId = `${socket.userId}-${to}-${Date.now()}`;
      
      // Store call state
      activeCalls.set(callId, {
        callerId: socket.userId,
        receiverId: to,
        status: "ringing",
        callType
      });

      // Notify receiver of incoming call
      io.to(receiverSocketId).emit("incoming-call", {
        callId,
        from: socket.userId,
        callType,
        callerInfo
      });

      console.log(`Call initiated: ${socket.userId} -> ${to} (${callType})`);
    });

    // Handle call acceptance
    socket.on("accept-call", ({ callId }) => {
      const call = activeCalls.get(callId);
      
      if (!call) {
        socket.emit("call-failed", { reason: "Call not found" });
        return;
      }

      // Validate that the user accepting is the intended receiver
      if (socket.userId !== call.receiverId) {
        socket.emit("call-failed", { reason: "Unauthorized" });
        return;
      }

      // Update call status
      call.status = "active";
      activeCalls.set(callId, call);

      const callerSocketId = connectedUsers.get(call.callerId);
      
      if (callerSocketId) {
        // Notify caller that call was accepted
        io.to(callerSocketId).emit("call-accepted", {
          callId,
          acceptedBy: socket.userId
        });
      }

      console.log(`Call accepted: ${callId}`);
    });

    // Handle call rejection
    socket.on("reject-call", ({ callId, reason }) => {
      const call = activeCalls.get(callId);
      
      if (!call) return;

      // Validate that the user rejecting is the intended receiver
      if (socket.userId !== call.receiverId) {
        return;
      }

      const callerSocketId = connectedUsers.get(call.callerId);
      
      if (callerSocketId) {
        // Notify caller that call was rejected
        io.to(callerSocketId).emit("call-rejected", {
          callId,
          rejectedBy: socket.userId,
          reason: reason || "Call declined"
        });
      }

      // Remove call from active calls
      activeCalls.delete(callId);

      console.log(`Call rejected: ${callId}`);
    });

    // Handle WebRTC offer
    socket.on("offer", ({ to, offer, callId }) => {
      const call = activeCalls.get(callId);
      
      // Validate call exists and sender is a participant
      if (!call || socket.userId !== call.callerId) {
        return;
      }
      
      const receiverSocketId = connectedUsers.get(to);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("offer", {
          from: socket.userId,
          offer,
          callId
        });
        
        console.log(`SDP offer sent: ${socket.userId} -> ${to}`);
      }
    });

    // Handle WebRTC answer
    socket.on("answer", ({ to, answer, callId }) => {
      const call = activeCalls.get(callId);
      
      // Validate call exists and sender is a participant
      if (!call || socket.userId !== call.receiverId) {
        return;
      }
      
      const callerSocketId = connectedUsers.get(to);
      
      if (callerSocketId) {
        io.to(callerSocketId).emit("answer", {
          from: socket.userId,
          answer,
          callId
        });
        
        console.log(`SDP answer sent: ${socket.userId} -> ${to}`);
      }
    });

    // Handle ICE candidates
    socket.on("ice-candidate", ({ to, candidate, callId }) => {
      const call = activeCalls.get(callId);
      
      // Validate call exists and sender is a participant
      if (!call || (socket.userId !== call.callerId && socket.userId !== call.receiverId)) {
        return;
      }
      
      const targetSocketId = connectedUsers.get(to);
      
      if (targetSocketId) {
        io.to(targetSocketId).emit("ice-candidate", {
          from: socket.userId,
          candidate,
          callId
        });
      }
    });

    // Handle call end
    socket.on("end-call", ({ callId, to }) => {
      const call = activeCalls.get(callId);
      
      if (call) {
        // Validate that user is a participant in the call
        if (socket.userId !== call.callerId && socket.userId !== call.receiverId) {
          return;
        }
        
        // Determine the other participant
        const otherUserId = call.callerId === socket.userId ? call.receiverId : call.callerId;
        const otherSocketId = connectedUsers.get(to || otherUserId);
        
        if (otherSocketId) {
          // Notify the other participant
          io.to(otherSocketId).emit("call-ended", {
            callId,
            endedBy: socket.userId
          });
        }

        // Remove call from active calls
        activeCalls.delete(callId);
        
        console.log(`Call ended: ${callId}`);
      }
    });

    // ==================== End WebRTC Signaling Events ====================

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // End any active calls involving this user
      activeCalls.forEach((call, callId) => {
        if (call.callerId === socket.userId || call.receiverId === socket.userId) {
          const otherUserId = call.callerId === socket.userId ? call.receiverId : call.callerId;
          const otherSocketId = connectedUsers.get(otherUserId);
          
          if (otherSocketId) {
            io.to(otherSocketId).emit("call-ended", {
              callId,
              endedBy: socket.userId,
              reason: "User disconnected"
            });
          }
          
          activeCalls.delete(callId);
        }
      });
      
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

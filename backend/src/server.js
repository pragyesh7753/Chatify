import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import passport from "passport";
import { createServer } from "http";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import fcmRoutes from "./routes/fcm.route.js";

import { connectAppwrite, databases, Query } from "./lib/appwrite.js";
import { cleanupExpiredTokens } from "./lib/cleanup.js";
import { initializeSocket } from "./lib/socket.js";
import { initializeFCM } from "./lib/fcm.js";
import "./lib/passport.js"; // Initialize passport strategies

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();

// Trust proxy - CRITICAL for Railway deployment
app.set('trust proxy', 1);

// Updated CORS configuration for production
app.use(cors({
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
  credentials: true, // If you're using cookies/sessions
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(express.json());
app.use(cookieParser());

// Initialize Passport (without sessions)
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/fcm", fcmRoutes);

// Add a health check endpoint for debugging
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    cookies: req.cookies
  });
});

// Keep-alive endpoint for preventing idling on  Railway
app.get("/api/internal/keepalive", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      if (req.query.secret !== process.env.CRON_SECRET) {
        return res.status(401).end();
      }

      await fetch("https://httpbin.org/get", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      await databases.list({ queries: [Query.limit(1)] });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Keep-alive endpoint error:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

// OAuth configuration check endpoint
app.get("/api/oauth-check", (req, res) => {
  res.json({
    status: "ok",
    oauth: {
      googleClientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
      googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
      frontendUrl: process.env.FRONTEND_URL,
      nodeEnv: process.env.NODE_ENV,
      sessionSecretConfigured: !!process.env.SESSION_SECRET,
    },
    timestamp: new Date().toISOString()
  });
});

// Manual cleanup endpoint (for admin purposes)
app.post("/api/cleanup", async (req, res) => {
  try {
    await cleanupExpiredTokens();
    res.json({ 
      status: "success", 
      message: "Cleanup completed",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Manual cleanup failed:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Cleanup failed" 
    });
  }
});

// Remove static file serving since frontend will be on Vercel
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../frontend/dist")));
//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
//   });
// }

// Initialize Socket.io
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectAppwrite();
  initializeFCM();
  
  // Run initial cleanup
  cleanupExpiredTokens();
  
  // Schedule cleanup to run every hour
  setInterval(() => {
    cleanupExpiredTokens();
  }, 60 * 60 * 1000); // 1 hour in milliseconds
});
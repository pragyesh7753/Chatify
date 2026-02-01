import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import passport from "passport";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import fcmRoutes from "./routes/fcm.route.js";
import streamRoutes from "./routes/stream.route.js";

import { connectAppwrite, databases, Query } from "./lib/appwrite.js";
import { cleanupExpiredTokens } from "./lib/cleanup.js";
import { initializeSocket } from "./lib/socket.js";
import { initializeFCM } from "./lib/fcm.js";
import logger from "./lib/logger.js";
import { validateEnv, getEnvInfo } from "./config/validate-env.js";
import { requestId } from "./middleware/requestId.js";
import "./lib/passport.js"; // Initialize passport strategies

// Validate environment variables before starting server
try {
  validateEnv();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();

// Trust proxy - CRITICAL for Railway deployment
app.set('trust proxy', 1);

// Request ID middleware (must be first to track all requests)
app.use(requestId);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary images
  contentSecurityPolicy: false, // Disable CSP for now (can configure later)
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { 
    success: false, 
    message: 'Too many requests from this IP, please try again later.' 
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful logins
  message: { 
    success: false, 
    message: 'Too many authentication attempts, please try again later.' 
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

// Updated CORS configuration for production
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://chatify.studio',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Return false instead of Error to prevent CORS error exposure
    logger.warn('CORS rejected origin', { origin, requestId: req?.id });
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(express.json());
app.use(cookieParser());

// Initialize Passport (without sessions)
app.use(passport.initialize());

// Apply rate limiters
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/refresh-token", authLimiter);
app.use("/api/", apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/fcm", fcmRoutes);
app.use("/api/stream", streamRoutes);

// Add a health check endpoint for debugging
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    requestId: req.id,
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
    logger.error("Keep-alive endpoint error", { error: error.message, requestId: req.id });
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
    logger.error("Manual cleanup failed", { error: error.message, requestId: req.id });
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

// Global error handler (must be last)
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    requestId: req.id,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

httpServer.listen(PORT, () => {
  logger.info("Server started", {
    port: PORT,
    ...getEnvInfo(),
  });
  
  connectAppwrite();
  initializeFCM();

  // Run initial cleanup
  cleanupExpiredTokens();

  // Schedule cleanup to run every hour
  setInterval(() => {
    cleanupExpiredTokens();
  }, 60 * 60 * 1000); // 1 hour in milliseconds
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, closing server gracefully`);
  
  httpServer.close(async () => {
    logger.info('HTTP server closed');
    
    // Close socket connections
    const io = (await import('./lib/socket.js')).getIO();
    if (io) {
      io.close(() => {
        logger.info('Socket.io closed');
      });
    }
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { 
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      name: reason.name,
    } : reason,
  });
});
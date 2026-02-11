import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import passport from "passport";
import { createServer } from "http";
import helmet from "helmet";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import fcmRoutes from "./routes/fcm.route.js";
import streamRoutes from "./routes/stream.route.js";
import callRoutes from "./routes/call.route.js";

import { connectAppwrite, databases, Query } from "./lib/appwrite.js";
import { cleanupExpiredTokens } from "./lib/cleanup.js";
import { initializeSocket } from "./lib/socket.js";
import { initializeFCM } from "./lib/fcm.js";
import logger from "./lib/logger.js";
import { validateEnv, getEnvInfo } from "./config/validate-env.js";
import { requestId } from "./middleware/requestId.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
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

// Keep-alive endpoint BEFORE CORS (for cron-job.org)
app.get("/api/internal/keepalive", async (req, res) => {
  try {
    const secret = req.query.secret || req.headers['x-cron-secret'];

    if (process.env.NODE_ENV === "production" && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json({ ok: true, timestamp: Date.now() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },

    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://res.cloudinary.com"
        ],
      },
    },
  })
);

// Updated CORS configuration for production
app.use(cors({
  origin: function (origin, callback) {

    // ✅ Allow requests with no origin (OAuth, preflight, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      process.env.FRONTEND_URL?.replace(/\/$/, "")
    ].filter(Boolean);

    const normalizedOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn('CORS rejected origin', { origin });
    return callback(new Error('Not allowed by CORS'), false);
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));


app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Initialize Passport (without sessions)
app.use(passport.initialize());

// Apply general rate limiter to non-auth routes
app.use("/api/users", apiLimiter);
app.use("/api/chat", apiLimiter);
app.use("/api/fcm", apiLimiter);
app.use("/api/stream", apiLimiter);
app.use("/api/calls", apiLimiter);

// Routes (auth limiter is applied inside auth routes)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/fcm", fcmRoutes);
app.use("/api/stream", streamRoutes);
app.use("/api/calls", callRoutes);

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



// OAuth configuration check endpoint - REMOVE IN PRODUCTION
if (process.env.NODE_ENV !== 'production') {
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
}

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
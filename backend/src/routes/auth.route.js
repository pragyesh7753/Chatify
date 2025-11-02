import express from "express";
import { login, logout, onboard, signup, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, changePassword, googleCallback } from "../controllers/auth.controller.js";
import { verifyEmailChange } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { optionalProtectRoute } from "../middleware/optionalAuth.middleware.js";
import { upload } from "../middleware/upload.js";
import passport from "../lib/passport.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", optionalProtectRoute, logout);

// Google OAuth routes
router.get("/google", 
  (req, res, next) => {
    console.log("Google OAuth initiated:", {
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
    });
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback", 
  (req, res, next) => {
    console.log("Google OAuth callback received:", {
      timestamp: new Date().toISOString(),
      query: req.query,
      sessionID: req.sessionID,
    });
    next();
  },
  passport.authenticate("google", { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    failureMessage: true 
  }),
  googleCallback
);

router.post("/onboarding", protectRoute, upload.single('profilePic'), (error, req, res, next) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 5MB allowed.' });
    }
    return res.status(400).json({ message: error.message });
  }
  next();
}, onboard);

router.get("/verify-email/:token", verifyEmail);
router.get("/verify-email-change/:token", verifyEmailChange);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/change-password", protectRoute, changePassword);

// check if user is logged in
router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
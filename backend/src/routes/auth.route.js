import express from "express";
import { login, logout, onboard, signup, verifyEmail, resendVerificationEmail } from "../controllers/auth.controller.js";
import { verifyEmailChange } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { optionalProtectRoute } from "../middleware/optionalAuth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", optionalProtectRoute, logout);

router.post("/onboarding", protectRoute, onboard);

router.get("/verify-email/:token", verifyEmail);
router.get("/verify-email-change/:token", verifyEmailChange);
router.post("/resend-verification", resendVerificationEmail);

// check if user is logged in
router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

export default router;
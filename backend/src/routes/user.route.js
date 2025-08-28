import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  acceptFriendRequest,
  getFriendRequests,
  getMyFriends,
  getOutgoingFriendReqs,
  getRecommendedUsers,
  getUserProfile,
  sendFriendRequest,
  updateProfile,
  requestEmailChange,
  verifyEmailChange,
  resendEmailVerification,
  updateOnlineStatus,
  setUserOffline,
} from "../controllers/user.controller.js";

const router = express.Router();

// apply auth middleware to all routes
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.get("/profile", getUserProfile);
router.put("/profile", updateProfile);

// Online status routes
router.put("/online-status", updateOnlineStatus);
router.post("/offline", setUserOffline);

// Email change routes
router.post("/change-email", requestEmailChange);
router.post("/verify-email", resendEmailVerification);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendReqs);

export default router;
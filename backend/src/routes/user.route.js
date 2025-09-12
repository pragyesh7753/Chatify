import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.js";
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
  resendEmailVerification,
} from "../controllers/user.controller.js";

const router = express.Router();

// apply auth middleware to all routes
router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.get("/profile", getUserProfile);
router.put("/profile", upload.single('profilePic'), (error, req, res, next) => {
  if (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum 5MB allowed.' });
    }
    return res.status(400).json({ message: error.message });
  }
  next();
}, updateProfile);

// Email change routes
router.post("/change-email", requestEmailChange);
router.post("/verify-email", resendEmailVerification);

router.post("/friend-request/:id", sendFriendRequest);
router.put("/friend-request/:id/accept", acceptFriendRequest);

router.get("/friend-requests", getFriendRequests);
router.get("/outgoing-friend-requests", getOutgoingFriendReqs);

export default router;
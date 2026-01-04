import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { saveFCMToken, removeFCMToken } from "../controllers/fcm.controller.js";

const router = express.Router();

router.post("/token", protectRoute, saveFCMToken);
router.delete("/token", protectRoute, removeFCMToken);

export default router;

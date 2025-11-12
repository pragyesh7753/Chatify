import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getChannels, 
  createOrGetChannel, 
  getMessages, 
  sendMessage 
} from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/channels", protectRoute, getChannels);
router.post("/channels", protectRoute, createOrGetChannel);
router.get("/messages/:channelId", protectRoute, getMessages);
router.post("/messages", protectRoute, sendMessage);

export default router;

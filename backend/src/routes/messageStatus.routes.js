import express from "express";
import {
  getMessageStatusStats,
  getUnreadMessages,
  getUnreadCounts,
} from "../controllers/messageStatus.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/stats/:userId", getMessageStatusStats);
router.get("/unread/:senderId", getUnreadMessages);
router.get("/unread-counts", getUnreadCounts);

export default router;
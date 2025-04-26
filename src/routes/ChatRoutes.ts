import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getChatHistory,
  markMessagesAsRead,
  getUnreadMessageCount,
  getChatsByRole,
} from "../controllers/ChatController";

const router = express.Router();

router.get("/history/:otherUserId", authMiddleware, getChatHistory);
router.put("/read/:senderId", authMiddleware, markMessagesAsRead);
router.get("/unread", authMiddleware, getUnreadMessageCount);
router.get("/role/:role", authMiddleware, getChatsByRole);

export default router;

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../controllers/NotificationController";

const router = express.Router();

router.get("/notifications", authMiddleware, getUserNotifications);
router.put("/notifications/:id", authMiddleware, markNotificationAsRead);
router.put(
  "/notifications/mark-all-read",
  authMiddleware,
  markAllNotificationsAsRead
);

export default router;

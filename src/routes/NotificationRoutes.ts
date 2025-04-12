import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getVendorNotifications,
} from "../controllers/NotificationController";

const router = express.Router();

router.get("/notifications", authMiddleware, getUserNotifications);
router.put("/notifications/:id", authMiddleware, markNotificationAsRead);
router.put(
  "/notifications/mark-all-read",
  authMiddleware,
  markAllNotificationsAsRead
);
router.get("/vendor/notifications", authMiddleware, getVendorNotifications);

export default router;

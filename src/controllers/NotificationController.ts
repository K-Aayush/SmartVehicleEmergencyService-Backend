import type { Request, Response } from "express";
import { db } from "../lib/prisma";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get user notifications
export const getUserNotifications = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Notification ID is required" });
      return;
    }

    // Check if notification exists and belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      res
        .status(404)
        .json({ success: false, message: "Notification not found" });
      return;
    }

    // Update notification
    const updatedNotification = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Mark notification error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    // Update all unread notifications for user
    await db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all notifications error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Create a notification
export const createNotification = async (userId: string, message: string) => {
  try {
    const notification = await db.notification.create({
      data: {
        userId,
        message,
        isRead: false,
      },
    });

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);
    return null;
  }
};

// Get vendor notifications
export const getVendorNotifications = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const vendorId = req.user.id;

    if (!vendorId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const notifications = await db.notification.findMany({
      where: { userId: vendorId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Get vendor notifications error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

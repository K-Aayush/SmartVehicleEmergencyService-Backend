import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { Role } from "@prisma/client";
import { createNotification } from "./NotificationController";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get all users with optional role filter
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { role } = req.query;

  try {
    const users = await db.user.findMany({
      where: role ? { role: role as Role } : {},
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        role: true,
        companyName: true,
        createdAt: true,
        isOnline: true,
        lastSeen: true,
        isBanned: true,
      },
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get user details by ID
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;
  const { userId } = req.params;

  if (!adminId || adminRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        role: true,
        companyName: true,
        createdAt: true,
        isOnline: true,
        lastSeen: true,
        vehicles: true,
        services: true,
        products: true,
        isBanned: true,
        orders: {
          include: {
            product: true,
          },
        },
        payment: true,
        emergencyRequest: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Ban user
export const banUser = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;
  const { userId } = req.params;
  const { reason } = req.body;

  if (!adminId || adminRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  if (!reason) {
    res.status(400).json({ success: false, message: "Ban reason is required" });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Create a notification for the user
    await createNotification(
      userId,
      `Your account has been banned. Reason: ${reason}`
    );

    // You might want to set a banned flag instead of deleting the user
    await db.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
      },
    });

    res.status(200).json({
      success: true,
      message: `User ${user.name} has been banned successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Ban user
export const UnbanUser = async (req: AuthenticatedRequest, res: Response) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;
  const { userId } = req.params;
  const { reason } = req.body;

  if (!adminId || adminRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  if (!reason) {
    res.status(400).json({ success: false, message: "Ban reason is required" });
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Create a notification for the user
    await createNotification(
      userId,
      `Your account has been unbanned. Reason: ${reason}`
    );

    // You might want to set a banned flag instead of deleting the user
    await db.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: reason,
      },
    });

    res.status(200).json({
      success: true,
      message: `User ${user.name} has been unbanned successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get total number of users
export const getTotalNoOfUsers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { role } = req.query;

  try {
    const totalUsers = await db.user.count({
      where: role ? { role: role as Role } : {},
    });

    res.status(200).json({ success: true, totalUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Get user statistics
export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const adminId = req.user?.id;
  const adminRole = req.user?.role;

  if (!adminId || adminRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    const [
      totalUsers,
      totalVendors,
      totalServiceProviders,
      totalProducts,
      totalOrders,
      totalEmergencyRequests,
    ] = await Promise.all([
      db.user.count({ where: { role: "USER" } }),
      db.user.count({ where: { role: "VENDOR" } }),
      db.user.count({ where: { role: "SERVICE_PROVIDER" } }),
      db.product.count(),
      db.order.count(),
      db.emergencyAssistance.count(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalVendors,
        totalServiceProviders,
        totalProducts,
        totalOrders,
        totalEmergencyRequests,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

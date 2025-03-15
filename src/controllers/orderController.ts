import { Request, Response } from "express";
import { db } from "../lib/prisma";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// API to get user orders
export const getUserOrders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    const orders = await db.order.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
      orderBy: {
        orderDate: "desc",
      },
    });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

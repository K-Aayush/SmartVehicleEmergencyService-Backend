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

// API to order products
export const orderProduct = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    res.status(400).json({
      success: false,
      message: "Product ID and valid quantity are required",
    });
    return;
  }

  try {
    // Check if the product exists and has enough stock
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    if (product.stock < quantity) {
      res.status(400).json({
        success: false,
        message: "Not enough stock available",
        availableStock: product.stock,
      });
      return;
    }

    // Calculate total price
    const totalPrice = product.price * quantity;

    // Create the order
    const newOrder = await db.order.create({
      data: {
        userId,
        productId,
        quantity,
        totalPrice,
      },
    });

    // Update product stock
    await db.product.update({
      where: { id: productId },
      data: {
        stock: product.stock - quantity,
      },
    });

    res.status(200).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

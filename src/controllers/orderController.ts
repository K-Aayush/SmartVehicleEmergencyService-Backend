import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { createNotification } from "./NotificationController";

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
      include: {
        Vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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

    // Get user details for vendor notification
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Calculate total price
    const totalPrice = product.price * quantity;

    // Format price
    const formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(totalPrice);

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

    // Create initial chat message
    if (product.Vendor && product.Vendor.id) {
      await db.chat.create({
        data: {
          senderId: userId,
          receiverId: product.Vendor.id,
          message: `Hi, I've just placed an order for ${quantity}x ${product.name}. Order ID: ${newOrder.id.slice(0, 8)}...`,
          isRead: false,
        },
      });
    }

    // Create a notification for the user
    await createNotification(
      userId,
      `Your order for ${
        product.name
      } has been placed successfully! Order ID: ${newOrder.id.slice(0, 8)}...`
    );

    // Create a notification for the vendor
    if (product.Vendor && product.Vendor.id) {
      await createNotification(
        product.Vendor.id,
        `New order received! ${
          user?.name || "A customer"
        } has ordered ${quantity} x ${
          product.name
        } for ${formattedPrice}. Order ID: ${newOrder.id.slice(0, 8)}...`
      );
    }

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

// Get order details by ID
export const getOrderById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    // Find the order
    const order = await db.order.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            images: true,
            Vendor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          include: {
            payment: {
              select: {
                id: true,
                status: true,
                paymentMethod: true,
                amount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    // Check if order exists and belongs to the user
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // Check if the order belongs to the user or the vendor of the product
    const isVendor = order.product.vendorId === userId;
    const isOwner = order.userId === userId;

    if (!isOwner && !isVendor) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to view this order",
      });
      return;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};
import type { Request, Response } from "express";
import { db } from "../lib/prisma";
import Stripe from "stripe";
import { createNotification } from "./NotificationController";

interface AuthenticatedRequest extends Request {
  user?: any;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});

// Create a payment intent with Stripe for product purchase
export const createStripePayment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const { productId, quantity, paymentMethod } = req.body;

    // Validate payload
    if (!productId || !quantity) {
      res.status(400).json({
        success: false,
        message: "Product ID and quantity are required",
      });
      return;
    }

    // Find the product
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { Vendor: true },
    });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    // Check if product is in stock
    if (product.stock < quantity) {
      res.status(400).json({
        success: false,
        message: "Insufficient stock available",
      });
      return;
    }

    // Calculate total price
    const totalPrice = product.price * quantity;

    // Convert amount to cents (Stripe uses cents)
    const amountInCents = Math.round(totalPrice * 100);

    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        userId,
        productId,
        quantity,
        vendorId: product.vendorId,
        productName: product.name,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create order record
    const order = await db.order.create({
      data: {
        userId,
        productId,
        quantity,
        totalPrice,
      },
    });

    // Create payment record
    const payment = await db.payment.create({
      data: {
        userId,
        amount: totalPrice,
        paymentMethod: paymentMethod === "WALLET" ? "WALLET" : "CREDIT",
        status: "PENDING",
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      orderId: order.id,
    });
  } catch (error) {
    console.error("Stripe payment error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// Verify Stripe payment and update order status
export const verifyStripePayment = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, paymentId, orderId } = req.body;

    if (!paymentIntentId || !paymentId || !orderId) {
      res.status(400).json({
        success: false,
        message: "Payment Intent ID, Payment ID, and Order ID are required",
      });
      return;
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find the payment and order
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // Format price
    const formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(order.totalPrice);

    // Update payment status and process order
    if (paymentIntent.status === "succeeded") {
      // Update payment to completed
      const updatedPayment = await db.payment.update({
        where: { id: paymentId },
        data: { status: "COMPLETED" },
      });

      // Update product stock
      await db.product.update({
        where: { id: order.productId },
        data: {
          stock: { decrement: order.quantity },
        },
      });

      // Create a notification for the user
      await createNotification(
        order.user.id,
        `Payment of ${formattedPrice} for ${order.product.name} was successful!`
      );

      // Create a notification for the vendor
      if (order.product.vendorId) {
        await createNotification(
          order.product.vendorId,
          `Payment received! ${
            order.user.name || "A customer"
          } has completed payment of ${formattedPrice} for ${
            order.quantity
          } x ${order.product.name}. Order ID: ${order.id.slice(0, 8)}...`
        );
      }

      res.status(200).json({
        success: true,
        message: "Payment successful and order processed",
        payment: updatedPayment,
        order: order,
      });
    } else if (paymentIntent.status === "processing") {
      // Update payment to in progress
      const updatedPayment = await db.payment.update({
        where: { id: paymentId },
        data: { status: "INPROGRESS" },
      });

      // Create a notification for the user
      await createNotification(
        order.user.id,
        `Your payment for ${order.product.name} is being processed.`
      );

      res.status(200).json({
        success: true,
        message: "Payment is being processed",
        payment: updatedPayment,
        stripeStatus: paymentIntent.status,
      });
    } else {
      // Create a notification for the user
      await createNotification(
        order.user.id,
        `There was an issue with your payment for ${order.product.name}. Status: ${paymentIntent.status}`
      );

      res.status(200).json({
        success: false,
        message: "Payment not completed",
        stripeStatus: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error("Stripe verification error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during payment verification",
    });
  }
};

// Get user payment history
export const getUserPayments = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const payments = await db.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

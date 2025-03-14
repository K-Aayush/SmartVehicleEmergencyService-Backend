import axios from "axios";
import { Request, Response } from "express";
import { db } from "../lib/prisma";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const khaltiPayment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const payload = req.body;
    const khaltiResponse = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/initiate/",
      payload,
      {
        headers: {
          Authorization: `key ${process.env.KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (khaltiResponse) {
      // Ensure the user exists
      const existingUser = await db.user.findUnique({
        where: { id: userId },
      });

      //if user doesnot exists
      if (!existingUser) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      //store new payment record
      const payment = await db.payment.create({
        data: {
          amount: payload.amount / 100,
          paymentMethod: "WALLET",
          status: "PENDING",
          userId: existingUser.id,
        },
      });

      res.json({
        success: true,
        data: khaltiResponse?.data,
        payment: payment.id,
      });
    } else {
      res.json({
        success: false,
        message: "Something went wrong",
      });
    }
  } catch (error) {
    res.json({ success: false, message: "Internal Server Error" });
  }
};

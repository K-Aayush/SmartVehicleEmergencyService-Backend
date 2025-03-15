import axios from "axios";
import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { PaymentStatus } from "@prisma/client";

interface AuthenticatedRequest extends Request {
  user?: any;
}

//api to do khalti payment
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

      res.status(200).json({
        success: true,
        data: khaltiResponse?.data,
        payment: payment.id,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Something went wrong",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//api to look up khalti
export const khaltiLookup = async (req: Request, res: Response) => {
  const { pidx } = req.body;

  if (!pidx) {
    res.status(400).json({
      success: false,
      message: "Payment ID is required",
    });
    return;
  }

  try {
    const KhaltiResponseLookup = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/lookup/",
      { pidx },
      {
        headers: {
          Authorization: `key ${process.env.KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (KhaltiResponseLookup) {
      const paymentStatus = KhaltiResponseLookup.data.status;
      const amount = KhaltiResponseLookup.data.total_amount / 100;

      //finding the new payment by created date and status
      const newPayment = await db.payment.findFirst({
        where: {
          amount: amount,
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      //if there is no payment record
      if (!newPayment) {
        res
          .status(400)
          .json({ success: false, message: "Payment record not found" });
        return;
      }

      //update the stored payment
      let updatedPaymentStatus: PaymentStatus;
      if (paymentStatus === "Completed") {
        updatedPaymentStatus = "COMPLETED";
      } else {
        updatedPaymentStatus = "PENDING";
      }

      //update the stored payment status
      const updatePayment = await db.payment.update({
        where: { id: newPayment?.id },
        data: { status: updatedPaymentStatus },
      });

      res.status(200).json({
        success: true,
        message: "Payment Successful",
        payment: updatePayment,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment not complete",
      });
    }
  } catch (error: any) {
    //if user cancels or expires payment
    if (error.response?.status === 400) {
      const errorMessage =
        error.response?.data?.status || "Payment cancelled or expired";
      console.log(errorMessage);

      //find the payment by created date and status
      const newPayment = await db.payment.findFirst({
        where: {
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      //update the payment status to failed
      if (newPayment) {
        await db.payment.update({
          where: { id: newPayment.id },
          data: { status: "PENDING" },
        });
      }

      res.status(400).json({
        success: false,
        message: errorMessage,
      });
    }
    console.log(`Khalti error: ${error}`);
    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

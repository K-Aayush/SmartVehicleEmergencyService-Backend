import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createStripePayment,
  getUserPayments,
  verifyStripePayment,
} from "../controllers/PaymentController";

const router = express.Router();

router.post("/create-payment", authMiddleware, createStripePayment);
router.post("/verify-payment", verifyStripePayment);
router.get("/payment-history", authMiddleware, getUserPayments);

export default router;

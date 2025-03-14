import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { khaltiPayment } from "../controllers/PaymentController";

const router = express.Router();

router.post("/khalti", authMiddleware, khaltiPayment);

export default router;

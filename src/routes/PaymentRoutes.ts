import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { khaltiLookup, khaltiPayment } from "../controllers/PaymentController";

const router = express.Router();

router.post("/khalti", authMiddleware, khaltiPayment);
router.post("/khalti-lookup", khaltiLookup);

export default router;

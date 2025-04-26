import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getOrderById,
  getUserOrders,
  getVendorOrders,
  orderProduct,
} from "../controllers/orderController";

const router = express.Router();

router.get("/orders", authMiddleware, getUserOrders);
router.post("/orders", authMiddleware, orderProduct);
router.get("/orders/:id", authMiddleware, getOrderById);
router.get("/vendor-orders", authMiddleware, getVendorOrders);

export default router;

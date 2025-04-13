import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getOrderById,
  getUserOrders,
  orderProduct,
} from "../controllers/orderController";

const router = express.Router();

router.get("/orders", authMiddleware, getUserOrders);
router.post("/orders", authMiddleware, orderProduct);
router.get("/orders/:id", authMiddleware, getOrderById);

export default router;

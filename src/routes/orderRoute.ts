import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { getUserOrders } from "../controllers/orderController";

const router = express.Router();

router.get("/orders", authMiddleware, getUserOrders);

export default router;

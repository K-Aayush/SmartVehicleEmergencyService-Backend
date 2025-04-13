import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  AddProduct,
  getLowStockProducts,
  getProducts,
  getProductsById,
  updateOrderStatus,
  updateProductStock,
} from "../controllers/VendorController";

const router = express.Router();

router.post(
  "/addProduct",
  authMiddleware,
  upload.array("imageUrl", 4),
  AddProduct
);

router.get("/getProducts", getProducts);
router.get("/getProductById/:id", getProductsById);
router.put("/updateProductStock", authMiddleware, updateProductStock);
router.get("/getLowStockProducts", authMiddleware, getLowStockProducts);
router.put("/updateOrderStatus", authMiddleware, updateOrderStatus);

export default router;

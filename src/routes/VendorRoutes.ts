import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  AddProduct,
  deleteProduct,
  getLowStockProducts,
  getProducts,
  getProductsById,
  updateOrderStatus,
  updateProduct,
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
router.put(
  "/updateProduct",
  authMiddleware,
  upload.array("imageUrl", 4),
  updateProduct
);
router.delete("/deleteProduct/:productId", authMiddleware, deleteProduct);

export default router;

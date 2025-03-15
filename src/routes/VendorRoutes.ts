import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  AddProduct,
  getLowStockProducts,
  getProducts,
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
router.put("/updateProductStock", authMiddleware, updateProductStock);
router.get("/getLowStockProducts", authMiddleware, getLowStockProducts);

export default router;

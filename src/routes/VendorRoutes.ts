import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { AddProduct } from "../controllers/VendorController";

const router = express.Router();

router.post(
  "/addProduct",
  authMiddleware,
  upload.single("imageUrl"),
  AddProduct
);

export default router;

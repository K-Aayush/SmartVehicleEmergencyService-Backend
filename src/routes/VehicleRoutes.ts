import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import upload from "../config/multer";
import {
  addVehicle,
  getUserVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} from "../controllers/VehicleController";

const router = express.Router();

router.post("/", authMiddleware, upload.single("image"), addVehicle);
router.get("/", authMiddleware, getUserVehicles);
router.get("/:id", authMiddleware, getVehicleById);
router.put("/:id", authMiddleware, upload.single("image"), updateVehicle);
router.delete("/:id", authMiddleware, deleteVehicle);

export default router;

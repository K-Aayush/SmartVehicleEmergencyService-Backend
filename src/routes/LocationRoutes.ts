import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  updateLocation,
  findNearbyServiceProviders,
} from "../controllers/LocationController";

const router = express.Router();

router.post("/update", authMiddleware, updateLocation);
router.get("/nearby", findNearbyServiceProviders);

export default router;

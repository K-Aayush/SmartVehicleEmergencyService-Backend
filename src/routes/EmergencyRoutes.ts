import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  requestEmergencyAssistance,
  getUserEmergencyRequests,
  getNearbyEmergencyRequests,
  acceptEmergencyRequest,
  getProviderEmergencyRequests
} from "../controllers/EmergencyController";

const router = express.Router();

router.post("/request", authMiddleware, requestEmergencyAssistance);
router.get("/user-requests", authMiddleware, getUserEmergencyRequests);
router.get("/nearby-requests", authMiddleware, getNearbyEmergencyRequests);
router.put("/accept/:requestId", authMiddleware, acceptEmergencyRequest);
router.get("/provider-requests", authMiddleware, getProviderEmergencyRequests);

export default router;

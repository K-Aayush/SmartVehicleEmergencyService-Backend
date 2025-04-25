import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  requestEmergencyAssistance,
  getUserEmergencyRequests,
  getNearbyEmergencyRequests,
  acceptEmergencyRequest,
} from "../controllers/EmergencyController";

const router = express.Router();

router.post("/request", authMiddleware, requestEmergencyAssistance);
router.get("/user-requests", authMiddleware, getUserEmergencyRequests);
router.get("/nearby-requests", authMiddleware, getNearbyEmergencyRequests);
router.put("/accept/:requestId", authMiddleware, acceptEmergencyRequest);

export default router;

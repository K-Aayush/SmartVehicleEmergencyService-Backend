import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getAllUsers, getTotalNoOfUsers } from "../controllers/AdminController";

const router = express.Router();

router.get("/getAllUsers", authMiddleware, getAllUsers);
router.get("/getTotalUsers", authMiddleware, getTotalNoOfUsers);

export default router;

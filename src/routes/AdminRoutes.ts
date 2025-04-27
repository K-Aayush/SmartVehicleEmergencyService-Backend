import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getAllUsers,
  getTotalNoOfUsers,
  getUserById,
  banUser,
  getUserStats,
} from "../controllers/AdminController";

const router = express.Router();

// User management routes
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/:userId", authMiddleware, getUserById);
router.delete("/users/:userId/ban", authMiddleware, banUser);
router.get("/stats/users/total", authMiddleware, getTotalNoOfUsers);
router.get("/stats/overview", authMiddleware, getUserStats);

export default router;
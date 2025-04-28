import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getAllUsers,
  getTotalNoOfUsers,
  getUserById,
  banUser,
  getUserStats,
  UnbanUser,
} from "../controllers/AdminController";

const router = express.Router();

// User management routes
router.get("/users", authMiddleware, getAllUsers);
router.get("/users/:userId", authMiddleware, getUserById);
router.delete("/users/:userId/ban", authMiddleware, banUser);
router.delete("/users/:userId/unban", authMiddleware, UnbanUser);
router.get("/stats/users/total", authMiddleware, getTotalNoOfUsers);
router.get("/stats/overview", authMiddleware, getUserStats);

export default router;

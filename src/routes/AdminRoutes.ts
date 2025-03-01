import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getAllUsers } from "../controllers/AdminController";

const router = express.Router();

router.get("/getAllUsers", authMiddleware, getAllUsers);

export default router;

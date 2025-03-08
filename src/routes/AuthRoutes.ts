import express from "express";
import upload from "../config/multer";
import {
  deleteUserData,
  getUserData,
  loginUser,
  registerUser,
} from "../controllers/AuthController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", upload.single("profileImage"), registerUser);

router.post("/login", loginUser);

router.get("/me", authMiddleware, getUserData);

router.delete("/me", authMiddleware, deleteUserData);

export default router;

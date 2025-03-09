import express from "express";
import upload from "../config/multer";
import {
  changePassword,
  deleteUserData,
  getUserData,
  loginUser,
  registerUser,
  updatePhoneNumber,
  updateProfile,
  updateUserName,
} from "../controllers/AuthController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", upload.single("profileImage"), registerUser);

router.post("/login", loginUser);

router.get("/me", authMiddleware, getUserData);

router.delete("/me", authMiddleware, deleteUserData);

router.put("/updateUserName", authMiddleware, updateUserName);

router.put("/updatePassword", authMiddleware, changePassword);

router.put("/updatePhone", authMiddleware, updatePhoneNumber);

router.put(
  "/updateProfile",
  authMiddleware,
  upload.single("profileImage"),
  updateProfile
);

export default router;

import express from "express";
import upload from "../config/multer";
import { loginUser, registerUser } from "../controllers/AuthController";

const router = express.Router();

router.post("/register", upload.single("profileImage"), registerUser);

router.post("/login", loginUser);

router.get("/me")

export default router;

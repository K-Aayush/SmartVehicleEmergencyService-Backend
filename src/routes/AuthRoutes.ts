import express from "express";
import upload from "../config/multer";

const router = express.Router();

router.post("/register", upload.single("image"))

router.post("login")

export default router;
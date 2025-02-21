import express from "express";
import upload from "../config/multer";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

export default router;

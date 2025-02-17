import { Request, Response } from "express";
import { db } from "../lib/prisma";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken";
import { v2 as cloudinary } from "cloudinary";
import { Prisma } from "@prisma/client";

export const registerUser = async (req: Request, res: Response) => {
  const { name, email, phone, password, role } = req.body;
  const imageFile = req.file;

  //check required fields
  if (!name || !email || !phone || !password || !role) {
    res.status(400).json({ success: false, message: "Missing details" });
    return;
  }

  try {
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    //check if there is any existing user
    if (existingUser) {
      res.status(400).json({ success: false, message: "user already exists" });
      return;
    }

    //Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    //validate Roles
    const allwoedRoles = ["USER", "VENDOR", "SERVICE_PROVIDER"];
    if (!allwoedRoles.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
      return;
    }

    //optional imageUpload field
    const imageUpload = imageFile
      ? await cloudinary.uploader.upload(imageFile.path)
      : null;

    //creating userdata
    const userData: Prisma.UserCreateInput = {
      email,
      password: hashPassword,
      name,
      phone,
      role,
      profileImage: imageUpload?.secure_url,
    };

    //store the userdata in database
    const createdUser = await db.user.create({ data: userData });

    //generate token
    const token = generateToken(createdUser.id, createdUser.role);

    res.status(201).json({
      success: true,
      message: "Registration Successful",
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
      token,
    });
  } catch (error) {
    console.error("Error during registration:" + error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

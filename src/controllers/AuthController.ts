import { Request, Response } from "express";
import { db } from "../lib/prisma";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken";
import { v2 as cloudinary } from "cloudinary";
import { Prisma } from "@prisma/client";

//register api
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, phone, password, role, companyName } = req.body;
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

    const existingPhoneNumber = await db.user.findUnique({
      where: { phone },
    });

    //check if phone number already exists
    if (existingPhoneNumber) {
      res
        .status(400)
        .json({ success: false, message: "Phone number already exists" });
      return;
    }

    //Hash password
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    console.log("Role value:", role);

    //validate Roles
    const allowedRoles = ["USER", "VENDOR", "SERVICE_PROVIDER"];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
      return;
    }

    if (role === "VENDOR" && !companyName) {
      res.status(400).json({
        success: false,
        message: "Company name is required for VENDOR",
      });
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
      companyName: role === "VENDOR" ? companyName : undefined,
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
        image: createdUser.profileImage,
        companyName: createdUser.companyName,
      },
      token,
    });
  } catch (error) {
    console.error("Error during registration:" + error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//login api
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  //check required fields
  if (!email || !password) {
    res.status(400).json({ success: false, message: "Missing details" });
    return;
  }

  try {
    //check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    //throw error if user doesn't exists
    if (!user) {
      res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    //verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
      return;
    }

    //generate token
    const token = generateToken(user.id, user.role);

    res.status(200).json({
      success: true,
      message: "Login Successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.profileImage,
        company: user.companyName,
      },
      token,
    });
  } catch (error) {
    console.error("Error during login:" + error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

interface AuthenticatedRequest extends Request {
  user?: any;
}

//getting user data
export const getUserData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    res.status(200).json({ success: true, user: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//deleting user data
export const deleteUserData = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    //find the user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    //check if user exists
    if (!user) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    //delete the vendor
    await db.user.delete({
      where: { id: userId },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//Api to update name
export const updateUserName = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { name } = req.body;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  if (!name || name.trim() === "") {
    res.status(400).json({ success: false, message: "Name cannot be empty" });
    return;
  }

  try {
    //find the user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    //check if user exists
    if (!user) {
      res.status(404).json({ success: false, message: "user not found" });
      return;
    }

    const updateUserName = await db.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Name Updated Successfully",
      updateUserName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

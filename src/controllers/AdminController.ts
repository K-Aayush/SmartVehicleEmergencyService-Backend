import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { Role } from "@prisma/client";

interface AuthenticatedRequest extends Request {
  user?: any;
}

//get all users
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { role } = req.query;

  try {
    const users = await db.user.findMany({
      where: role ? { role: role as Role } : {},
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImage: true,
        role: true,
      },
    });

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getTotalNoOfUsers = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || userRole !== "ADMIN") {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { role } = req.query;

  try {
    const totalUsers = await db.user.count({
      where: role ? { role: role as Role } : {},
    });

    res.status(200).json({ success: true, totalUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

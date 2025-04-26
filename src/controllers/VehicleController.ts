import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { v2 as cloudinary } from "cloudinary";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Add vehicle
export const addVehicle = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { brand, model, year, vin } = req.body;
  const imageFile = req.file;

  if (!brand || !model || !year || !vin) {
    res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
    return;
  }

  try {
    // Check if VIN already exists
    const existingVehicle = await db.vehicle.findUnique({
      where: { vin },
    });

    if (existingVehicle) {
      res.status(400).json({
        success: false,
        message: "A vehicle with this VIN already exists",
      });
      return;
    }

    // Upload image if provided
    let imageUrl;
    if (imageFile) {
      const uploadResult = await cloudinary.uploader.upload(imageFile.path);
      imageUrl = uploadResult.secure_url;
    }

    // Create vehicle
    const vehicle = await db.vehicle.create({
      data: {
        userId,
        brand,
        model,
        year: parseInt(year.toString()),
        vin,
        image: imageUrl,
      },
    });

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle,
    });
  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get user's vehicles
export const getUserVehicles = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    const vehicles = await db.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      vehicles,
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get vehicle by ID
export const getVehicleById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    const vehicle = await db.vehicle.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Vehicle not found or unauthorized access",
      });
      return;
    }

    res.status(200).json({
      success: true,
      vehicle,
    });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update vehicle
export const updateVehicle = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { brand, model, year, vin } = req.body;
  const imageFile = req.file;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    // Check if vehicle exists and belongs to user
    const existingVehicle = await db.vehicle.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingVehicle) {
      res.status(404).json({
        success: false,
        message: "Vehicle not found or unauthorized access",
      });
      return;
    }

    // Check if new VIN already exists (if VIN is being updated)
    if (vin && vin !== existingVehicle.vin) {
      const vinExists = await db.vehicle.findUnique({
        where: { vin },
      });

      if (vinExists) {
        res.status(400).json({
          success: false,
          message: "A vehicle with this VIN already exists",
        });
        return;
      }
    }

    // Handle image update if provided
    let imageUrl = existingVehicle.image;
    if (imageFile) {
      // Delete old image if exists
      if (existingVehicle.image) {
        const publicId = existingVehicle.image.split("/").pop()?.split(".")[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
      // Upload new image
      const uploadResult = await cloudinary.uploader.upload(imageFile.path);
      imageUrl = uploadResult.secure_url;
    }

    // Update vehicle
    const updatedVehicle = await db.vehicle.update({
      where: { id },
      data: {
        brand: brand || existingVehicle.brand,
        model: model || existingVehicle.model,
        year: year ? parseInt(year.toString()) : existingVehicle.year,
        vin: vin || existingVehicle.vin,
        image: imageUrl,
      },
    });

    res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle: updatedVehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Delete vehicle
export const deleteVehicle = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    // Check if vehicle exists and belongs to user
    const vehicle = await db.vehicle.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!vehicle) {
      res.status(404).json({
        success: false,
        message: "Vehicle not found or unauthorized access",
      });
      return;
    }

    // Delete vehicle image from Cloudinary if exists
    if (vehicle.image) {
      const publicId = vehicle.image.split("/").pop()?.split(".")[0];
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    // Delete vehicle
    await db.vehicle.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

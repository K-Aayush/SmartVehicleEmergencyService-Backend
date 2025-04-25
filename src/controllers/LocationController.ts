import { Request, Response } from "express";
import { db } from "../lib/prisma";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Update user's location
export const updateLocation = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { latitude, longitude, isAvailable } = req.body;

    if (!userId || !latitude || !longitude) {
      res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
      return;
    }

    // Update user's location
    await db.location.upsert({
      where: {
        userId,
      },
      update: {
        latitude,
        longitude,
        isAvailable: isAvailable ?? true,
        lastUpdated: new Date(),
      },
      create: {
        userId,
        latitude,
        longitude,
        isAvailable: isAvailable ?? true,
      },
    });

    // Update user's coordinates
    await db.user.update({
      where: { id: userId },
      data: {
        latitude,
        longitude,
      },
    });

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Find nearby service providers
export const findNearbyServiceProviders = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { latitude, longitude, radius = 10, type } = req.query;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
      return;
    }

    // Convert coordinates to numbers
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const searchRadius = parseFloat(radius as string);

    // Find service providers within radius
    const providers = await db.user.findMany({
      where: {
        role: "SERVICE_PROVIDER",
        isOnline: true,
        latitude: {
          gte: lat - searchRadius / 111.32, 
          lte: lat + searchRadius / 111.32,
        },
        longitude: {
          gte: lng - searchRadius / (111.32 * Math.cos(lat * (Math.PI / 180))),
          lte: lng + searchRadius / (111.32 * Math.cos(lat * (Math.PI / 180))),
        },
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        phone: true,
        latitude: true,
        longitude: true,
        profileImage: true,
        services: true,
      },
    });

    res.status(200).json({
      success: true,
      providers: providers.map((provider) => ({
        ...provider,
        distance: calculateDistance(
          lat,
          lng,
          provider.latitude,
          provider.longitude
        ),
      })),
    });
  } catch (error) {
    console.error("Error finding nearby service providers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: any,
  lon2: any
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

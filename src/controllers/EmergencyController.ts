import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { createNotification } from "./NotificationController";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Request emergency assistance
export const requestEmergencyAssistance = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { vehicleId, assistanceType, description, latitude, longitude } =
      req.body;

    if (!userId || !vehicleId || !assistanceType || !latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Create emergency request
    const emergencyRequest = await db.emergencyAssistance.create({
      data: {
        userId,
        vehicleId,
        assistanceType,
        description,
        status: "PENDING",
        latitude,
        longitude,
        location: `${latitude},${longitude}`, // Store as string for legacy support
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
          },
        },
      },
    });

    // Find nearby service providers
    const providers = await db.user.findMany({
      where: {
        role: "SERVICE_PROVIDER",
        latitude: {
          gte: Number(latitude) - 0.1, // Approximately 11km radius
          lte: Number(latitude) + 0.1,
        },
        longitude: {
          gte: Number(longitude) - 0.1,
          lte: Number(longitude) + 0.1,
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    // Create chat messages and notifications for each provider
    const chatPromises = providers.map(async (provider) => {
      // Create initial chat message from user to provider
      await db.chat.create({
        data: {
          senderId: userId,
          receiverId: provider.id,
          message: `Emergency ${assistanceType} assistance needed for my ${
            emergencyRequest.vehicle.year
          } ${emergencyRequest.vehicle.brand} ${
            emergencyRequest.vehicle.model
          }. Location: ${latitude},${longitude}. ${
            description ? `Details: ${description}` : ""
          }`,
        },
      });

      // Create initial chat message from provider to user
      await db.chat.create({
        data: {
          senderId: provider.id,
          receiverId: userId,
          message: `I've received your emergency request for ${assistanceType} assistance. I'll check your location and respond shortly.`,
        },
      });

      // Create notification for the provider
      await createNotification(
        provider.id,
        `Emergency assistance needed! ${emergencyRequest.user.name} needs ${assistanceType} assistance for their ${emergencyRequest.vehicle.year} ${emergencyRequest.vehicle.brand} ${emergencyRequest.vehicle.model}.`
      );
    });

    await Promise.all(chatPromises);

    // Create notification for the user
    await createNotification(
      userId,
      `Your emergency request has been sent to ${providers.length} nearby service providers. They will contact you shortly.`
    );

    res.status(201).json({
      success: true,
      message: "Emergency assistance requested",
      request: emergencyRequest,
      nearbyProviders: providers.length,
    });
  } catch (error) {
    console.error("Error requesting emergency assistance:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get user's emergency requests
export const getUserEmergencyRequests = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const requests = await db.emergencyAssistance.findMany({
      where: { userId },
      include: {
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching emergency requests:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get nearby emergency requests for service providers
export const getNearbyEmergencyRequests = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const providerId = req.user?.id;
    const { latitude, longitude, radius = 10 } = req.query;

    if (!providerId || !latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Convert coordinates to numbers
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const searchRadius = parseFloat(radius as string);

    const requests = await db.emergencyAssistance.findMany({
      where: {
        status: "PENDING",
        latitude: {
          gte: lat - searchRadius / 111.32,
          lte: lat + searchRadius / 111.32,
        },
        longitude: {
          gte: lng - searchRadius / (111.32 * Math.cos(lat * (Math.PI / 180))),
          lte: lng + searchRadius / (111.32 * Math.cos(lat * (Math.PI / 180))),
        },
        vehicle: {
          userId: providerId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      requests: requests.map((request) => ({
        ...request,
        distance: calculateDistance(
          lat,
          lng,
          Number(request.latitude),
          Number(request.longitude)
        ),
      })),
    });
  } catch (error) {
    console.error("Error fetching nearby emergency requests:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get service provider's emergency request history
export const getProviderEmergencyRequests = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const providerId = req.user?.id;
    const userRole = req.user?.role;

    if (!providerId || userRole !== "SERVICE_PROVIDER") {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }

    const requests = await db.emergencyAssistance.findMany({
      where: {
        vehicle: {
          userId: providerId,
        },
        status: {
          in: ["INPROGRESS", "COMPLETED", "PENDING"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        vehicle: {
          select: {
            brand: true,
            model: true,
            year: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching provider emergency requests:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Accept emergency request
export const acceptEmergencyRequest = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const providerId = req.user?.id;
    const { requestId } = req.params;

    if (!providerId || !requestId) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    const request = await db.emergencyAssistance.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
      return;
    }

    if (request.status !== "PENDING") {
      res.status(400).json({
        success: false,
        message: "This request has already been accepted",
      });
      return;
    }

    // Update request status
    const updatedRequest = await db.emergencyAssistance.update({
      where: { id: requestId },
      data: { status: "INPROGRESS" },
    });

    // Create a chat message
    await db.chat.create({
      data: {
        senderId: providerId,
        receiverId: request.user.id,
        message: `I've accepted your emergency request and I'm on my way to help you.`,
      },
    });

    // Notify the user
    await createNotification(
      request.user.id,
      `A service provider has accepted your emergency assistance request and is on their way!`
    );

    res.status(200).json({
      success: true,
      message: "Emergency request accepted",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error accepting emergency request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// complete emergency request
export const completeEmergencyRequest = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const providerId = req.user?.id;
    const { requestId } = req.params;

    if (!providerId || !requestId) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    const request = await db.emergencyAssistance.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      res.status(404).json({
        success: false,
        message: "Emergency request not found",
      });
      return;
    }

    if (request.status !== "INPROGRESS") {
      res.status(400).json({
        success: false,
        message: "This request has already been completed",
      });
      return;
    }

    // Update request status
    const updatedRequest = await db.emergencyAssistance.update({
      where: { id: requestId },
      data: { status: "COMPLETED" },
    });

    // Create a chat message
    await db.chat.create({
      data: {
        senderId: providerId,
        receiverId: request.user.id,
        message: `I've complete your emergency request. Thank you for choosing me for your support`,
      },
    });

    // Notify the user
    await createNotification(
      request.user.id,
      `A service provider has completed your emergency assistance request.`
    );

    res.status(200).json({
      success: true,
      message: "Emergency request completed",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Error accepting emergency request:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
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

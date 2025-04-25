import { Server, Socket } from "socket.io";
import { db } from "../lib/prisma";

export const initializeSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    // Handle user authentication
    socket.on("authenticate", async (userId: string) => {
      try {
        socket.join(userId);
        await db.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });
      } catch (error) {
        console.error("Authentication error:", error);
      }
    });

    // Handle private messages
    socket.on(
      "private_message",
      async (data: {
        senderId: string;
        receiverId: string;
        message: string;
      }) => {
        try {
          const { senderId, receiverId, message } = data;

          // Save message to database
          const chat = await db.chat.create({
            data: {
              senderId,
              receiverId,
              message,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                },
              },
            },
          });

          // Send message to receiver if online
          io.to(receiverId).emit("new_message", chat);

          // Send delivery status back to sender
          io.to(senderId).emit("message_sent", {
            messageId: chat.id,
            status: "delivered",
          });
        } catch (error) {
          console.error("Error saving chat:", error);
        }
      }
    );

    // Handle location updates
    socket.on(
      "location_update",
      async (data: { userId: string; latitude: number; longitude: number }) => {
        try {
          const { userId, latitude, longitude } = data;

          await db.location.upsert({
            where: {
              userId,
            },
            update: {
              latitude,
              longitude,
              lastUpdated: new Date(),
            },
            create: {
              userId,
              latitude,
              longitude,
            },
          });

          // Broadcast location update to relevant users
          socket.broadcast.emit("provider_location_update", {
            userId,
            latitude,
            longitude,
          });
        } catch (error) {
          console.error("Error updating location:", error);
        }
      }
    );

    // Handle emergency assistance requests
    socket.on(
      "emergency_request",
      async (data: {
        requestId: string;
        location: { latitude: number; longitude: number };
      }) => {
        try {
          const { requestId, location } = data;

          // Find nearby service providers
          const providers = await db.user.findMany({
            where: {
              role: "SERVICE_PROVIDER",
              isOnline: true,
              latitude: {
                gte: location.latitude - 0.1,
                lte: location.latitude + 0.1,
              },
              longitude: {
                gte: location.longitude - 0.1,
                lte: location.longitude + 0.1,
              },
            },
            select: {
              id: true,
            },
          });

          // Broadcast emergency request to nearby service providers
          providers.forEach((provider) => {
            io.to(provider.id).emit("new_emergency_request", {
              requestId,
              location,
            });
          });
        } catch (error) {
          console.error("Error broadcasting emergency request:", error);
        }
      }
    );

    // Handle emergency request acceptance
    socket.on(
      "emergency_accepted",
      async (data: {
        requestId: string;
        providerId: string;
        providerLocation: { latitude: number; longitude: number };
      }) => {
        try {
          const { requestId, providerId, providerLocation } = data;

          const request = await db.emergencyAssistance.findUnique({
            where: { id: requestId },
            select: { userId: true },
          });

          if (request) {
            // Update request status
            await db.emergencyAssistance.update({
              where: { id: requestId },
              data: { status: "INPROGRESS" },
            });

            // Notify the user that their request was accepted
            io.to(request.userId).emit("emergency_provider_assigned", {
              requestId,
              providerId,
              providerLocation,
            });
          }
        } catch (error) {
          console.error("Error handling emergency acceptance:", error);
        }
      }
    );

    // Handle provider location updates for emergency requests
    socket.on(
      "emergency_provider_location",
      async (data: {
        requestId: string;
        providerId: string;
        location: { latitude: number; longitude: number };
      }) => {
        try {
          const { requestId, providerId, location } = data;

          const request = await db.emergencyAssistance.findUnique({
            where: { id: requestId },
            select: { userId: true },
          });

          if (request) {
            // Send provider's location to the user
            io.to(request.userId).emit("emergency_provider_location_update", {
              requestId,
              providerId,
              location,
            });
          }
        } catch (error) {
          console.error("Error updating provider location:", error);
        }
      }
    );

    // Handle typing indicators
    socket.on("typing", (data: { senderId: string; receiverId: string }) => {
      const { senderId, receiverId } = data;
      io.to(receiverId).emit("user_typing", { userId: senderId });
    });

    // Handle read receipts
    socket.on(
      "mark_read",
      async (data: { messageIds: string[]; readerId: string }) => {
        try {
          const { messageIds, readerId } = data;

          await db.chat.updateMany({
            where: {
              id: { in: messageIds },
              receiverId: readerId,
            },
            data: { isRead: true },
          });

          // Notify senders that their messages were read
          const messages = await db.chat.findMany({
            where: { id: { in: messageIds } },
            select: { senderId: true, id: true },
          });

          const senderIds = [...new Set(messages.map((m) => m.senderId))];
          senderIds.forEach((senderId) => {
            const readMessageIds = messages
              .filter((m) => m.senderId === senderId)
              .map((m) => m.id);

            io.to(senderId).emit("messages_read", {
              messageIds: readMessageIds,
              readerId,
            });
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
    );

    // Handle disconnection
    socket.on("disconnect", async () => {
      try {
        const userId = Array.from(socket.rooms)[1]; // Get userId from rooms
        if (userId) {
          await db.user.update({
            where: { id: userId },
            data: {
              isOnline: false,
              lastSeen: new Date(),
            },
          });
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
};

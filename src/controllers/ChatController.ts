import { Request, Response } from "express";
import { db } from "../lib/prisma";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Get chats by role
export const getChatsByRole = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { role } = req.params;

    if (!userId || !role) {
      res
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
      return;
    }

    // Get all unique conversations where the user has participated
    const conversations = await db.chat.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            profileImage: true,
            companyName: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            role: true,
            profileImage: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter conversations by role and get the latest message for each unique conversation
    const uniqueConversations = new Map();

    conversations.forEach((chat) => {
      const otherUser = chat.senderId === userId ? chat.receiver : chat.sender;

      if (otherUser.role === role) {
        const conversationKey = otherUser.id;

        if (
          !uniqueConversations.has(conversationKey) ||
          chat.createdAt > uniqueConversations.get(conversationKey).createdAt
        ) {
          uniqueConversations.set(conversationKey, {
            ...chat,
            otherUser,
          });
        }
      }
    });

    const result = Array.from(uniqueConversations.values());

    res.status(200).json({
      success: true,
      conversations: result,
    });
  } catch (error) {
    console.error("Error fetching chats by role:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get chat history between two users
export const getChatHistory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { otherUserId } = req.params;

    if (!userId || !otherUserId) {
      res.status(400).json({ success: false, message: "Missing user IDs" });
      return;
    }

    const chats = await db.chat.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(200).json({ success: true, chats });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Mark chat messages as read
export const markMessagesAsRead = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { senderId } = req.params;

    if (!userId || !senderId) {
      res.status(400).json({ success: false, message: "Missing user IDs" });
      return;
    }

    await db.chat.updateMany({
      where: {
        senderId: senderId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get unread message count
export const getUnreadMessageCount = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const unreadCount = await db.chat.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error("Error getting unread message count:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

import express from "express";
import cors from "cors";
import "dotenv/config";
import { Server } from "socket.io";
import { createServer } from "http";
import authRoutes from "./routes/AuthRoutes";
import vendorRoutes from "./routes/VendorRoutes";
import adminRoutes from "./routes/AdminRoutes";
import paymentRoutes from "./routes/PaymentRoutes";
import orderRoutes from "./routes/orderRoutes";
import notificationRoutes from "./routes/NotificationRoutes";
import chatRoutes from "./routes/ChatRoutes";
import locationRoutes from "./routes/LocationRoutes";
import emergencyRoutes from "./routes/EmergencyRoutes";
import connectCloudinary from "./config/cloudinary";
import { initializeSocket } from "./socket/socketHandler";

// Initialize express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Initialize Socket.IO
initializeSocket(io);

// Cloudinary connect
(async () => {
  await connectCloudinary();
})();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/emergency", emergencyRoutes);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});

import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/AuthRoutes";
import vendorRoutes from "./routes/VendorRoutes";
import adminRoutes from "./routes/AdminRoutes";
import paymentRoutes from "./routes/PaymentRoutes";
import connectCloudinary from "./config/cloudinary";

//initialize express
const app = express();

//cloudinary connect
(async () => {
  await connectCloudinary();
})();

//Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes
app.use("/api/auth", authRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});

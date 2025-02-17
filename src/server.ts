import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/AuthRoutes";
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on PORT: ${PORT}`);
});

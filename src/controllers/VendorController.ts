import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

interface AuthenticatedRequest extends Request {
  user?: any;
}

//api to add new products
export const AddProduct = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { name, category, price, stock } = req.body;
  const imageFile = req.file;

  console.log("Received body:", req.body);
  console.log("Received file:", req.file);

  if (!name || !category || !price || !stock || !imageFile) {
    res.status(400).json({ success: false, message: "Missing details" });
    return;
  }

  try {
    // Ensure the Vendor (User) exists
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      res.status(404).json({ success: false, message: "Vendor not found" });
      return;
    }

    const productData: Prisma.ProductCreateInput = {
      name,
      category,
      price: parseFloat(price),
      stock: parseInt(stock),
      Vendor: {
        connect: { id: userId },
      },
    };

    const newProduct = await db.product.create({
      data: productData,
    });

    const images = imageFile
      ? await cloudinary.uploader.upload(imageFile.path)
      : null;

    const productImage = await db.productImage.create({
      data: {
        productId: newProduct.id,
        imageUrl: images?.secure_url,
      },
    });

    res.status(200).json({
      success: true,
      message: "Added New Product",
      product: newProduct,
      images: productImage.imageUrl,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

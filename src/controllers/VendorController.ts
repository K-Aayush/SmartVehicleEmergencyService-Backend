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
  const imageFile = req.files as Express.Multer.File[];

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

    const uploadImages = await Promise.all(
      imageFile.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path);
        return result.secure_url;
      })
    );

    await Promise.all(
      uploadImages.map(async (url) => {
        await db.productImage.create({
          data: {
            productId: newProduct.id,
            imageUrl: url,
          },
        });
      })
    );

    res.status(200).json({
      success: true,
      message: "Added New Product",
      product: newProduct,
      images: uploadImages,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

//api to get product
export const getProducts = async (req: Request, res: Response) => {
  try {
    //optional filter products
    const { vendorId, sortBy, order } = req.query;

    //Allowed sorting fields
    const allowedSortFields = ["price", "createdAt", "stock", "name"];

    // Default sorting: by `createdAt` in descending order (newest first)
    let orderBy = { createdAt: "desc" } as Record<string, "asc" | "desc">;

    // Apply sorting if valid sortBy field is provided
    if (sortBy && allowedSortFields.includes(sortBy as string)) {
      orderBy = {
        [sortBy as string]: order === "asc" ? "asc" : "desc", 
      };
    }

    const products = await db.product.findMany({
      where: vendorId ? { vendorId: vendorId as string } : undefined,
      include: {
        images: true,
        Vendor: {
          select: {
            name: true,
            companyName: true,
          },
        },
      },
      orderBy,
    });

    if (!products || products.length === 0) {
      res.status(404).json({ success: false, message: "No Products Found" });
      return;
    }

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

//api to update product stock
export const updateProductStock = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { productId, newStock } = req.body;

  if (!productId || newStock === undefined || newStock < 0) {
    res.status(400).json({
      success: false,
      message: "Product ID and valid stock amount are required",
    });
    return;
  }

  try {
    // Check if the product exists and belongs to the vendor
    const product = await db.product.findFirst({
      where: {
        id: productId,
        vendorId: userId,
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to update it",
      });
      return;
    }

    // Update product stock
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        stock: newStock,
      },
    });

    res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product stock:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

//Api to check low product stock for a vendor
export const getLowStockProducts = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { threshold = 5 } = req.query; // Default threshold is 5

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  try {
    const lowStockProducts = await db.product.findMany({
      where: {
        vendorId: userId,
        stock: {
          lte: Number(threshold),
        },
      },
      include: {
        images: true,
      },
      orderBy: {
        stock: "asc",
      },
    });

    res.status(200).json({
      success: true,
      lowStockProducts,
    });
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

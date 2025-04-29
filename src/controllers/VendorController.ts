import { Request, Response } from "express";
import { db } from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { createNotification } from "./NotificationController";

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

//api to get product
export const getProductsForVendor = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const vendorId = req.user.id;

    if (!vendorId) {
      res.status(404).json({ success: false, message: "Unauthorized Access" });
      return;
    }

    const products = await db.product.findMany({
      where: { vendorId },
      include: {
        images: true,
        Vendor: {
          select: {
            name: true,
            companyName: true,
          },
        },
      },
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

//api to get product
export const getProductsById = async (req: Request, res: Response) => {
  try {
    //optional filter products
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, message: "ID is required" });
      return;
    }

    const product = await db.product.findUnique({
      where: { id: id as string },
      include: {
        images: true,
        Vendor: {
          select: {
            name: true,
            companyName: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ success: false, message: "No Product Found" });
      return;
    }

    res.status(200).json({ success: true, product });
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

// Update product
export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  const { productId, name, category, price, stock } = req.body;
  const imageFile = req.files as Express.Multer.File[];

  if (!productId || (!name && !category && !price && !stock && !imageFile)) {
    res.status(400).json({
      success: false,
      message: "Product ID and at least one field to update are required",
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
      include: {
        images: true,
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to update it",
      });
      return;
    }

    // Prepare update data
    const updateData: Prisma.ProductUpdateInput = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price) updateData.price = parseFloat(price);
    if (stock) updateData.stock = parseInt(stock);

    // Update product
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: updateData,
    });

    // Handle image updates if provided
    if (imageFile && imageFile.length > 0) {
      // Delete existing images from Cloudinary
      for (const image of product.images) {
        if (image.imageUrl) {
          const publicId = image.imageUrl.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }

      // Delete existing image records
      await db.productImage.deleteMany({
        where: { productId },
      });

      // Upload new images
      const uploadImages = await Promise.all(
        imageFile.map(async (file) => {
          const result = await cloudinary.uploader.upload(file.path);
          return result.secure_url;
        })
      );

      // Create new image records
      await Promise.all(
        uploadImages.map(async (url) => {
          await db.productImage.create({
            data: {
              productId,
              imageUrl: url,
            },
          });
        })
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

// Delete product
export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const userId = req.user?.id;
  const { productId } = req.params;

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized access" });
    return;
  }

  if (!productId) {
    res.status(400).json({ success: false, message: "Product ID is required" });
    return;
  }

  try {
    // Check if the product exists and belongs to the vendor
    const product = await db.product.findFirst({
      where: {
        id: productId,
        vendorId: userId,
      },
      include: {
        images: true,
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found or you don't have permission to delete it",
      });
      return;
    }

    // Delete images from Cloudinary
    for (const image of product.images) {
      if (image.imageUrl) {
        const publicId = image.imageUrl.split("/").pop()?.split(".")[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
      }
    }

    // Delete the product (this will cascade delete images due to the relation)
    await db.product.delete({
      where: { id: productId },
    });

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

// Update order status
export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const vendorId = req.user?.id;
  const { orderId, status } = req.body;

  if (!vendorId || !orderId || !status) {
    res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
    return;
  }

  try {
    // Find the order and check if it belongs to a product from this vendor
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // Check if the product belongs to this vendor
    if (order.product.vendorId !== vendorId) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to update this order",
      });
      return;
    }

    // Update the order status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        product: true,
      },
    });

    // Create a notification for the user
    let notificationMessage = "";

    switch (status.toUpperCase()) {
      case "PROCESSING":
        notificationMessage = `Your order for ${order.product.name} is now being processed.`;
        break;
      case "SHIPPED":
        notificationMessage = `Great news! Your order for ${order.product.name} has been shipped.`;
        break;
      case "DELIVERED":
        notificationMessage = `Your order for ${order.product.name} has been delivered. Enjoy!`;
        break;
      case "COMPLETED":
        notificationMessage = `Your order for ${order.product.name} is now complete. Thank you for your purchase!`;
        break;
      default:
        notificationMessage = `The status of your order for ${order.product.name} has been updated to ${status}.`;
    }

    await createNotification(order.user.id, notificationMessage);

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

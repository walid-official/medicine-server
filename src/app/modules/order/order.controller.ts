// src/modules/orders/order.controller.ts
import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import path from "path";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { createOrder, updateOrderInvoice, getAllOrders, getOrderById, updateOrder, deleteOrder } from "./order.service";
import { sendResponse } from "../../utils/sendResponse";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import fs from "fs";
import mongoose from "mongoose";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createOrderController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, items, discount } = req.body;
    const order = await createOrder({ user, items, discount });

    // Build PDF in memory
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk) => buffers.push(chunk));

    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      try {
        // Upload to Cloudinary as a raw file
        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "invoices", resource_type: "raw" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as UploadApiResponse);
            }
          );
          streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
        });

        // Save invoiceUrl to DB
        const invoiceUrl = uploadResult.secure_url;
        await updateOrderInvoice((order._id as mongoose.Types.ObjectId).toString(), invoiceUrl);

        // Return response
        sendResponse(res, {
          success: true,
          statusCode: httpStatus.CREATED,
          message: "Order created successfully",
          data: {
            orderId: order._id,
            invoiceUrl,
          },
        });
      } catch (err) {
        next(err);
      }
    });

    // Fonts
    const normalFontPath = path.join(__dirname, "../../../assets/fonts/NotoSansBengali_Condensed-Regular.ttf");
    const boldFontPath = path.join(__dirname, "../../../assets/fonts/NotoSansBengali-Black.ttf");

    if (fs.existsSync(normalFontPath)) doc.font(normalFontPath);

    // ------------------------
    // PDF Content
    // ------------------------

    // Header - Business Info
    if (fs.existsSync(boldFontPath)) doc.font(boldFontPath);
    doc
      .fontSize(22)
      .text("Talha Pharmacy", { align: "center", underline: true })
      .moveDown(0.5);

    if (fs.existsSync(normalFontPath)) doc.font(normalFontPath);
    doc
      .fontSize(12)
      .text("Phone: +880123456789", { align: "center" })
      .text("Email: info@talhapharmacy.com", { align: "center" })
      .text("Address: 123 Pharmacy Street, Dhaka, Bangladesh", { align: "center" })
      .moveDown(2);

    // Invoice Title
    if (fs.existsSync(boldFontPath)) doc.font(boldFontPath);
    doc.fontSize(16).text("Invoice", { align: "left", underline: true }).moveDown(0.5);

    // Customer Info
    if (fs.existsSync(normalFontPath)) doc.font(normalFontPath);
    doc.fontSize(12).text(`Customer Name: ${user.name}`);
    if (user.phone) doc.text(`Customer Phone: ${user.phone}`);
    doc.moveDown(1);

    // Items Purchased
    doc.fontSize(12).text("Items Purchased:", { underline: true }).moveDown(0.5);
    order.items.forEach((i: any) => {
      doc.text(`${i.name} x ${i.quantity} = ৳${i.subtotal}`);
    });

    doc.moveDown();

    // Subtotal & Discount
    doc.text(`Subtotal: ৳${order.subtotal}`);
    doc.text(`Discount: ৳${order.discount}`);

    // Grand Total in Bold
    if (fs.existsSync(boldFontPath)) doc.font(boldFontPath);
    doc.text(`Grand Total: ৳${order.grandTotal}`);

    doc.end();
  }
);


export const getAllOrdersController = catchAsync(async (req: Request, res: Response) => {
  const {
    filter,
    start,
    end,
    orderId,
    page,
    limit,
    sortBy,
    sortOrder,
    customerName,
    medicineName,
  } = req.query as Record<string, string | undefined>;

  const result = await getAllOrders({
    filter: filter as "daily" | "weekly" | "monthly" | "yearly" | "custom",
    start,
    end,
    orderId,
    customerName,
    medicineName,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    sortBy,
    sortOrder: (sortOrder as "asc" | "desc") || undefined,
  });

  // Normalize pagination meta to satisfy TMeta (ensure totalPage exists)
  const rawMeta = result.meta as any;
  const normalizedMeta = rawMeta
    ? {
        page: rawMeta.page ?? (page ? parseInt(page, 10) : 1),
        limit: rawMeta.limit ?? (limit ? parseInt(limit, 10) : undefined),
        totalPage:
          rawMeta.totalPage ??
          rawMeta.totalPages ??
          (rawMeta.total && rawMeta.limit ? Math.ceil(rawMeta.total / rawMeta.limit) : 0),
        total: rawMeta.total ?? 0,
      }
    : undefined;

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Orders fetched successfully",
    data: result.data,
    meta: normalizedMeta,
  });
});


//  GET ORDER BY ID
export const getOrderByIdController = catchAsync(async (req: Request, res: Response) => {
  const order = await getOrderById(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order fetched successfully",
    data: order,
  });
});

//  UPDATE ORDER
export const updateOrderController = catchAsync(async (req: Request, res: Response) => {
  const updated = await updateOrder(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order updated successfully",
    data: updated,
  });
});

//  DELETE ORDER
export const deleteOrderController = catchAsync(async (req: Request, res: Response) => {
  const deleted = await deleteOrder(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Order deleted successfully",
    data: deleted,
  });
});
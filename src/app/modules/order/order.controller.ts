import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import path from "path";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { createOrder } from "./order.service";
import { sendResponse } from "../../utils/sendResponse";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import fs from "fs";
// ⚙️ Configure Cloudinary (if you use it)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const createOrderController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, items, discount } = req.body;
    const order = await createOrder({ user, items, discount });

    // Create PDF in memory instead of writing to disk
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    const buffers: any[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      // 🚀 Upload to Cloudinary (optional)
      const uploadPromise = new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "invoices", resource_type: "raw" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as UploadApiResponse);
          }
        );
        streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
      });

      const uploadResult = await uploadPromise;

      sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Order created successfully",
        data: {
          orderId: order._id,
          invoiceUrl: uploadResult.secure_url, 
        },
      });
    });

    // 🔤 Use Bangla font (if available)
    const fontPath = path.join(__dirname, "../../../assets/fonts/NotoSansBengali-Black.ttf");
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    }

    // 🧾 Build PDF content
    doc.fontSize(20).text("Invoice", { align: "center" }).moveDown();
    doc.fontSize(12).text(`Name: ${user.name}`);
    if (user.phone) doc.text(`Phone: ${user.phone}`);
    doc.moveDown();

    order.items.forEach((i: any) => {
      doc.text(`${i.name} x ${i.quantity} = ৳${i.subtotal}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: ৳${order.subtotal}`);
    doc.text(`Discount: ৳${order.discount}`);
    doc.text(`Grand Total: ৳${order.grandTotal}`);

    doc.end(); // Finish PDF
  }
);

import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { createOrder } from "./order.service";
import { sendResponse } from "../../utils/sendResponse";

export const createOrderController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { user, items, discount } = req.body;

    const order = await createOrder({ user, items, discount });

    const invoicesDir = path.join(__dirname, "../../invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const invoiceFileName = `invoice-${order._id}.pdf`;
    const filePath = path.join(invoicesDir, invoiceFileName);

    //  Load Unicode font that supports Bangla + Taka symbol
    const fontPath = path.join(
      __dirname,
      "../../../assets/fonts/NotoSansBengali-Black.ttf"
    );
    

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    //  Apply custom font
    if (fs.existsSync(fontPath)) {
      doc.font(fontPath);
    } else {
      console.warn(" Font file not found at:", fontPath);
    }

    //  Write invoice content
    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();
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

    doc.end();

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const invoiceUrl = `${baseUrl}/invoices/${invoiceFileName}`;

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Order created successfully",
      data: { orderId: order._id, invoiceUrl },
    });
  }
);

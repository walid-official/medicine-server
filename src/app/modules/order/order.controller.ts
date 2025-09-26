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

    // PDF invoice generate
    const invoicesDir = path.join(__dirname, "../../invoices");
    if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);

    const filePath = path.join(invoicesDir, `invoice-${order._id}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();
    doc.text(`Name: ${user.name}`);
    doc.text(`Email: ${user.email}`);
    if (user.phone) doc.text(`Phone: ${user.phone}`);
    doc.moveDown();

    order.items.forEach((i) => {
      doc.text(`${i.name} x ${i.quantity} = $${i.subtotal}`);
    });

    doc.text(`Subtotal: BD${order.subtotal}`);
    doc.text(`Discount: BD${order.discount}`);
    doc.text(`Grand Total: BD${order.grandTotal}`);
    doc.end();

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Order created successfully",
      data: { orderId: order._id, invoicePath: filePath },
    });
  }
);

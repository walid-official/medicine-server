import { IMedicine, MedicineModel } from "../medicines/medicine.model";
import { OrderFilters } from "./order.interface";

import { OrderModel } from "./order.model";
import mongoose from "mongoose";

interface CreateOrderInput {
  user: {
    name: string;
    phone?: string;
  };
  items: { medicineId: string; quantity: number }[];
  discount?: number;
}

// Updated to match your schema
const CUSTOMER_NAME_FIELDS = ["user.name"];
const MEDICINE_NAME_FIELDS = [
  "items.medicineId.name",
  "items.medicineName",    
];

// Escapes user input for safe regex
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface PaginatedOrders {
  data: any[]; // replace with your `OrderDocument` type if available
  meta: PaginationMeta;
}

export const createOrder = async (input: CreateOrderInput) => {
  const { user, items, discount } = input;

  if (!items || items.length === 0) throw new Error("Cart is empty");

  let subtotal = 0;
  const orderItems: any[] = [];

  for (const item of items) {
    const medicine = await MedicineModel.findById(item.medicineId);
    if (!medicine) throw new Error(`Medicine not found`);

    if (medicine.quantity < item.quantity)
      throw new Error(`Not enough stock for ${medicine.name}`);

    const soldPrice = medicine.mrp;
    const itemSubtotal = soldPrice * item.quantity;
    subtotal += itemSubtotal;

    orderItems.push({
      medicineId: medicine._id,
      name: medicine.name,
      quantity: item.quantity,
      price: soldPrice,
      subtotal: parseFloat(itemSubtotal.toFixed(2)),
    });

    medicine.quantity -= item.quantity;
    await medicine.save();
  }

  const grandTotal = subtotal - (discount || 0);

  const order = new OrderModel({
    user,
    items: orderItems,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat((discount || 0).toFixed(2)),
    grandTotal: parseFloat(grandTotal.toFixed(2)),
  });

  await order.save();
  return order;
};

// Update order invoice
export const updateOrderInvoice = async (orderId: string | mongoose.Types.ObjectId, invoiceUrl: string) => {
  await OrderModel.findByIdAndUpdate(orderId, { invoiceUrl }, { new: true });
};


export const getAllOrders = async (filters: OrderFilters = {}): Promise<PaginatedOrders> => {
  const { filter, start, end, orderId, customerName, medicineName } = filters;

  // Pagination & sorting
  const page = Number.isFinite(filters.page as unknown as number)
    ? Math.max(1, Number(filters.page))
    : 1;
  const reqLimit = Number.isFinite(filters.limit as unknown as number)
    ? Number(filters.limit)
    : 20;
  const limit = Math.min(Math.max(1, reqLimit), 100);
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder: 1 | -1 = filters.sortOrder === "asc" ? 1 : -1;

  // --- If single orderId is provided ---
  if (orderId) {
    const order = await OrderModel.findById(orderId)
      .populate("items.medicineId", "name") // populate medicine name
      .lean();
    if (!order) throw new Error("Order not found");

    return {
      data: [order],
      meta: {
        total: 1,
        page: 1,
        limit: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
      },
    };
  }

  const now = new Date();
  const bangladeshOffset = 6 * 60; // UTC+6
  const localNow = new Date(now.getTime() + bangladeshOffset * 60 * 1000);

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // --- Set date range ---
  switch (filter) {
    case "daily":
      startDate = new Date(localNow);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(localNow);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "weekly":
      startDate = new Date(localNow);
      startDate.setDate(localNow.getDate() - 7);
      endDate = localNow;
      break;
    case "monthly":
      startDate = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
      endDate = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "yearly":
      startDate = new Date(localNow.getFullYear(), 0, 1);
      endDate = new Date(localNow.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case "custom":
      if (start && end) {
        startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
    default:
      break;
  }

  // Guard invalid date range
  if (startDate && endDate && startDate > endDate) {
    throw new Error("Invalid date range: start is after end");
  }

  // Convert to UTC for all except "custom"
  if (filter !== "custom") {
    if (startDate) startDate = new Date(startDate.getTime() - bangladeshOffset * 60 * 1000);
    if (endDate) endDate = new Date(endDate.getTime() - bangladeshOffset * 60 * 1000);
  }

  // --- Build query ---
  const andClauses: Record<string, unknown>[] = [];

  if (startDate && endDate) {
    andClauses.push({ createdAt: { $gte: startDate, $lte: endDate } });
  }

  // Search by customer name
  if (customerName && customerName.trim()) {
    const regex = escapeRegex(customerName.trim());
    andClauses.push({
      $or: CUSTOMER_NAME_FIELDS.map((field) => ({
        [field]: { $regex: regex, $options: "i" },
      })),
    });
  }

  // Search by medicine name
  if (medicineName && medicineName.trim()) {
    const regex = escapeRegex(medicineName.trim());
    andClauses.push({
      $or: MEDICINE_NAME_FIELDS.map((field) => ({
        [field]: { $regex: regex, $options: "i" },
      })),
    });
  }

  const query: Record<string, unknown> = andClauses.length ? { $and: andClauses } : {};

  // Count total for pagination
  const total = await OrderModel.countDocuments(query);

  // Pagination skip
  const skip = (page - 1) * limit;

  // Query execution
  const orders = await OrderModel.find(query)
    .populate("items.medicineId", "name")
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data: orders,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
    },
  };
};


//  Get single order by ID
export const getOrderById = async (id: string) => {
  const order = await OrderModel.findById(id).populate("items.medicineId", "name");
  if (!order) throw new Error("Order not found");
  return order;
};

//  Update order
export const updateOrder = async (id: string, payload: Partial<any>) => {
  const updated = await OrderModel.findByIdAndUpdate(id, payload, { new: true });
  if (!updated) throw new Error("Order not found or update failed");
  return updated;
};

//  Delete order
export const deleteOrder = async (id: string) => {
  const deleted = await OrderModel.findByIdAndDelete(id);
  if (!deleted) throw new Error("Order not found or delete failed");
  return deleted;
};
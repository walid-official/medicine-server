import { OrderModel } from "../order/order.model";
import { MedicineModel } from "../medicines/medicine.model";
import { InventoryFilters } from "./inventory.interface";
import mongoose from "mongoose";

interface MedicineInventoryReport {
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  category?: string;
  manufacturer?: string;
  strength?: string;
  batchNumber?: string;
  mrp: number;
  price: number;
  soldQuantity: number;
  remainingQuantity: number;
  totalQuantity: number; // sold + remaining
}

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

interface PaginatedInventoryReport {
  data: MedicineInventoryReport[];
  meta: PaginationMeta;
  summary: {
    totalMedicines: number;
    totalSoldQuantity: number;
    totalRemainingQuantity: number;
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
  };
}

// Escapes user input for safe regex
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getInventoryReport = async (
  filters: InventoryFilters = {}
): Promise<PaginatedInventoryReport> => {
  const { filter, start, end, medicineId, medicineName, category } = filters;

  // Pagination & sorting
  const page = Number.isFinite(filters.page as unknown as number)
    ? Math.max(1, Number(filters.page))
    : 1;
  const reqLimit = Number.isFinite(filters.limit as unknown as number)
    ? Number(filters.limit)
    : 10;
  const limit = Math.min(Math.max(1, reqLimit), 100);
  const sortBy = filters.sortBy || "soldQuantity";
  const sortOrder: 1 | -1 = filters.sortOrder === "asc" ? 1 : -1;

  // Calculate date range based on filter
  const now = new Date();
  const bangladeshOffset = 6 * 60; // UTC+6
  const localNow = new Date(now.getTime() + bangladeshOffset * 60 * 1000);

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Set date range
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
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(localNow);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "monthly":
      startDate = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(localNow.getFullYear(), localNow.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case "yearly":
      startDate = new Date(localNow.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
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
      // If no filter, show all-time data
      break;
  }

  // Guard invalid date range
  if (startDate && endDate && startDate > endDate) {
    throw new Error("Invalid date range: start is after end");
  }

  // Convert to UTC for all except "custom"
  if (filter !== "custom" && startDate && endDate) {
    startDate = new Date(startDate.getTime() - bangladeshOffset * 60 * 1000);
    endDate = new Date(endDate.getTime() - bangladeshOffset * 60 * 1000);
  }

  // Build query for orders
  const orderQuery: Record<string, unknown> = {};
  if (startDate && endDate) {
    orderQuery.createdAt = { $gte: startDate, $lte: endDate };
  }

  // Get all orders in the date range
  const orders = await OrderModel.find(orderQuery).lean();

  // Aggregate sold quantities by medicine
  const soldQuantitiesMap = new Map<string, number>();

  orders.forEach((order) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        // Handle medicineId - it can be ObjectId, string, or populated object
        let medId: string | null = null;
        if (item.medicineId) {
          if (typeof item.medicineId === "string") {
            medId = item.medicineId;
          } else if (item.medicineId._id) {
            medId = item.medicineId._id.toString();
          } else if (item.medicineId.toString) {
            medId = item.medicineId.toString();
          }
        }
        
        if (medId) {
          const current = soldQuantitiesMap.get(medId) || 0;
          soldQuantitiesMap.set(medId, current + (item.quantity || 0));
        }
      });
    }
  });

  // Build medicine query
  const medicineQuery: Record<string, unknown> = {};

  if (medicineId) {
    medicineQuery._id = new mongoose.Types.ObjectId(medicineId);
  }

  if (medicineName && medicineName.trim()) {
    const regex = escapeRegex(medicineName.trim());
    medicineQuery.name = { $regex: regex, $options: "i" };
  }

  if (category && category.trim()) {
    medicineQuery.category = category.trim();
  }

  // Get all medicines (or filtered)
  const medicines = await MedicineModel.find(medicineQuery).lean();

  // Build inventory report
  const inventoryReport: MedicineInventoryReport[] = medicines.map((medicine) => {
    const medId = medicine._id.toString();
    const soldQuantity = soldQuantitiesMap.get(medId) || 0;
    const remainingQuantity = medicine.quantity || 0;
    const totalQuantity = soldQuantity + remainingQuantity;

    return {
      medicineId: new mongoose.Types.ObjectId(medId),
      medicineName: medicine.name,
      category: medicine.category,
      manufacturer: medicine.manufacturer,
      strength: medicine.strength,
      batchNumber: medicine.batchNumber,
      mrp: medicine.mrp,
      price: medicine.price,
      soldQuantity,
      remainingQuantity,
      totalQuantity,
    };
  });

  // Apply sorting
  inventoryReport.sort((a, b) => {
    let aValue: any = a[sortBy as keyof MedicineInventoryReport];
    let bValue: any = b[sortBy as keyof MedicineInventoryReport];

    // Handle string comparison
    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (sortOrder === 1) {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  // Calculate summary
  const totalSoldQuantity = inventoryReport.reduce((sum, item) => sum + item.soldQuantity, 0);
  const totalRemainingQuantity = inventoryReport.reduce(
    (sum, item) => sum + item.remainingQuantity,
    0
  );

  // Apply pagination
  const total = inventoryReport.length;
  const skip = (page - 1) * limit;
  const paginatedData = inventoryReport.slice(skip, skip + limit);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    data: paginatedData,
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
    summary: {
      totalMedicines: total,
      totalSoldQuantity,
      totalRemainingQuantity,
      dateRange: {
        start: startDate || null,
        end: endDate || null,
      },
    },
  };
};
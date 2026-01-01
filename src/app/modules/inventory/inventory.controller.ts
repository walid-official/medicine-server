import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { getInventoryReport } from "./inventory.service";
import { sendResponse } from "../../utils/sendResponse";

export const getInventoryReportController = catchAsync(
  async (req: Request, res: Response) => {
    const {
      filter,
      start,
      end,
      medicineId,
      medicineName,
      category,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query as Record<string, string | undefined>;

    const result = await getInventoryReport({
      filter: filter as "daily" | "weekly" | "monthly" | "yearly" | "custom",
      start,
      end,
      medicineId,
      medicineName,
      category,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder: (sortOrder as "asc" | "desc") || undefined,
    });

    // Normalize pagination meta
    const rawMeta = result.meta as any;
    const normalizedMeta = rawMeta
      ? {
          page: rawMeta.page ?? (page ? parseInt(page, 10) : 1),
          limit: rawMeta.limit ?? (limit ? parseInt(limit, 10) : 10),
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
      message: "Inventory report fetched successfully",
      data: result.data,
      meta: normalizedMeta,
    });
  }
);


import { Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import {
  createManyMedicines,
  createMedicine,
  deleteMedicine,
  getMedicineById,
  getMedicines,
  updateMedicine,
  updateMedicineMRP,
} from "./medicine.service";

// Create a new medicine
// export const createMedicineController = catchAsync(
//   async (req: Request, res: Response, next: NextFunction) => {
//     const medicine = await createMedicine(req.body);
//     sendResponse(res, {
//       success: true,
//       statusCode: httpStatus.CREATED,
//       message: "Medicine created successfully",
//       data: medicine,
//     });
//   }
// );

export const createMedicineController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    let result;

    if (Array.isArray(req.body)) {
      // Bulk insert
      result = await createManyMedicines(req.body);
    } else {
      // Single insert
      result = await createMedicine(req.body);
    }

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: Array.isArray(req.body)
        ? "Medicines created successfully"
        : "Medicine created successfully",
      data: result,
    });
  }
);

export const getMedicinesController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { search, page, limit } = req.query;
    const result = await getMedicines(
      search as string,
      Number(page) || 1,
      Number(limit) || 10
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Medicines retrieved successfully",
      data: result,
    });
  }
);

// Get medicine by ID
export const getMedicineByIdController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const medicine = await getMedicineById(req.params.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Medicine retrieved successfully",
      data: medicine,
    });
  }
);

// Update a medicine
export const updateMedicineController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const medicine = await updateMedicine(req.params.id, req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Medicine updated successfully",
      data: medicine,
    });
  }
);

// Delete a medicine
export const deleteMedicineController = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await deleteMedicine(req.params.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Medicine deleted successfully",
      data: null,
    });
  }
);

export const updateMedicineMRPController = catchAsync(
  async (req: Request, res: Response) => {
    const { mrp } = req.body;
    const updatedMedicine = await updateMedicineMRP(req.params.id, mrp);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Medicine MRP updated successfully",
      data: updatedMedicine,
    });
  }
);
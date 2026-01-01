// medicine.routes.ts
import { Router } from "express";
import {
  createMedicineController,
  deleteMedicineController,
  getExpiredMedicinesController,
  getMedicineByIdController,
  getMedicinesController,
  updateMedicineController,
  updateMedicineMRPController,
} from "./medicine.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { createMedicineSchema } from "./medicine.zodSchema";
// import { validateRequest } from "../../middlewares/validateRequest";
import type { Request, Response, NextFunction } from "express";

const router = Router();

type MedicineDTO = ReturnType<typeof createMedicineSchema.parse>;

interface MedicineRequest extends Request {
    body: MedicineDTO | MedicineDTO[];
}

const validateMedicineRequest = (
    req: MedicineRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        if (Array.isArray(req.body)) {
            req.body.forEach((item) => createMedicineSchema.parse(item));
        } else {
            createMedicineSchema.parse(req.body);
        }
        next();
    } catch (err: unknown) {
        next(err as Error);
    }
};

router.post(
  "/",
  checkAuth((Role.ADMIN)),
  validateMedicineRequest,
  createMedicineController
);

router.get("/", checkAuth((Role.ADMIN,Role.MANAGER)), getMedicinesController);
router.get("/expired", checkAuth((Role.ADMIN)), getExpiredMedicinesController);
router.get("/:id", checkAuth((Role.ADMIN)), getMedicineByIdController);
router.put("/:id", checkAuth((Role.ADMIN)), updateMedicineController);
router.delete("/:id", checkAuth((Role.ADMIN)), deleteMedicineController);
router.patch("/:id/mrp", checkAuth((Role.MANAGER,Role.ADMIN)), updateMedicineMRPController);

export const MedicineRoutes = router;
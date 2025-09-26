import { Router } from "express";
import { createMedicineController, deleteMedicineController, getMedicineByIdController, getMedicinesController, updateMedicineController } from "./medicine.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { createMedicineSchema } from "./medicine.zodSchema";
import { validateRequest } from "../../middlewares/validateRequest";

const router = Router();

router.post("/", checkAuth(...Object.values(Role)), validateRequest(createMedicineSchema), createMedicineController );
router.get("/",  checkAuth(...Object.values(Role)), getMedicinesController); 
router.get("/:id", checkAuth(...Object.values(Role)), getMedicineByIdController);
router.put("/:id", checkAuth(...Object.values(Role)), updateMedicineController);
router.delete("/:id", checkAuth(...Object.values(Role)), deleteMedicineController);

export const MedicineRoutes = router;
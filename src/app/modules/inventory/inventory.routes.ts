import { Router } from "express";
import { getInventoryReportController } from "./inventory.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router = Router();

// Only ADMIN and MANAGER can access inventory reports
router.get("/", checkAuth(Role.ADMIN), getInventoryReportController);

export const InventoryRoutes = router;


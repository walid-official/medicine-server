import { Router } from "express";
import { createOrderController } from "./order.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router = Router();

// Only authenticated users with any role can create orders
router.post("/", checkAuth(...Object.values(Role)), createOrderController);

export const OrderRoutes = router;

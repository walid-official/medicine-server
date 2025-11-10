// src/modules/orders/order.routes.ts
import { Router } from "express";
import {
  createOrderController,
  deleteOrderController,
  getAllOrdersController,
  getOrderByIdController,
  updateOrderController,
} from "./order.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";

const router = Router();

//  Only ADMIN and MANAGER can create orders
router.post(
  "/",
  checkAuth(Role.ADMIN, Role.MANAGER),
  createOrderController
);

//  Only ADMIN can access the rest
router.get("/", checkAuth(Role.ADMIN), getAllOrdersController);
router.get("/:id", checkAuth(Role.ADMIN), getOrderByIdController);
router.patch("/:id", checkAuth(Role.ADMIN), updateOrderController);
router.delete("/:id", checkAuth(Role.ADMIN), deleteOrderController);

export const OrderRoutes = router;
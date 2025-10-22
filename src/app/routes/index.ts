import { Router } from "express";
import { UserRoutes } from "../modules/user/user.route";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { MedicineRoutes } from "../modules/medicines/medicine.routes";
import { OrderRoutes } from "../modules/order/order.routes";
import { ReportRoutes } from "../modules/reports/report.controller";

export const router = Router();

const moduleRoutes = [
  { path: "/user", route: UserRoutes },
  { path: "/auth", route: AuthRoutes },
  { path: "/medicines", route: MedicineRoutes },
  { path: "/orders", route: OrderRoutes },
  { path: "/reports", route: ReportRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

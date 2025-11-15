import { Router } from "express";
import {createUserController, getLoggedInRoleUser, getLoggedInUser, updatePasswordController, updateUserController } from "./user.controller";
import { validateRequest } from "../../middlewares/validateRequest";
import { createUserZodSchema, updateUserZodSchema } from "./user.zodSchema";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "./user.interface";

const router = Router();

//  Register new user
router.post(
  "/register",
  validateRequest(createUserZodSchema),
  createUserController
);

router.patch(
  "/:id",
  validateRequest(updateUserZodSchema),
  checkAuth(...Object.values(Role)),
  updateUserController
);

router.patch(
  "/:id/update-password",
  checkAuth((Role.ADMIN)),
  updatePasswordController
);

router.get(
  "/me",
  checkAuth(...Object.values(Role)), 
  getLoggedInUser
);

router.get(
  "/role",
  checkAuth(...Object.values(Role)), 
  getLoggedInRoleUser
);

export const UserRoutes = router;
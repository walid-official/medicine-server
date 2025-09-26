
import { Router } from "express";
import { changePassword, credentialsLogin, forgotPassword, getNewAccessToken, googleCallbackController, logout, resetPassword } from "./auth.controller";
import { checkAuth } from "../../middlewares/checkAuth";
import { Role } from "../user/user.interface";
import { envVars } from "../../config/env";
import passport from "passport";
import { Request, Response, NextFunction } from "express"
const router = Router()

router.post("/login", credentialsLogin)
router.post("/logout", logout)
router.post("/refresh-token",  getNewAccessToken)
router.post("/change-password", checkAuth(...Object.values(Role)), changePassword);
router.post("/reset-password", checkAuth(...Object.values(Role)), resetPassword)
router.post("/forgot-password", forgotPassword)
router.get("/google", async (req: Request, res: Response, next: NextFunction) => {
    const redirect = req.query.redirect || "/"
    passport.authenticate("google", { scope: ["profile", "email"], state: redirect as string })(req, res, next)
})
// api/v1/auth/google/callback?state=/booking
router.get("/google/callback", passport.authenticate("google", { failureRedirect: `${envVars.FRONTEND_URL}/login?error=There is some issues with your account. Please contact with out support team!` }), googleCallbackController)
export const AuthRoutes = router;
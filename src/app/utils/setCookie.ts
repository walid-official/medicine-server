import { Response, CookieOptions } from "express";
import { envVars } from "../config/env";

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

export const setAuthCookie = (res: Response, tokenInfo: AuthTokens) => {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction, 
    sameSite: isProduction ? "none" : "lax", 
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  };

  if (tokenInfo.accessToken)
    res.cookie("accessToken", tokenInfo.accessToken, cookieOptions);

  if (tokenInfo.refreshToken)
    res.cookie("refreshToken", tokenInfo.refreshToken, cookieOptions);
};
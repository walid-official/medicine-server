import cors from "cors";
import express, { Request, Response } from "express";
import { globalErrorHandler } from './app/middlewares/globalErrorHandlers';
import routeNotFound from "./app/middlewares/routeNotFound";
import { router } from "./app/routes";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import passport from "passport";
import { envVars } from "./app/config/env";
import "./app/config/passport";

const app = express();

app.use(express.json());

// CORS configuration
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,              
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(expressSession({
  secret: envVars.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Welcome to Backend Server"
  });
});

app.use(globalErrorHandler);
app.use(routeNotFound);

export default app;

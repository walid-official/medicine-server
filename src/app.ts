import cors from "cors";
import express from "express";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandlers";
import routeNotFound from "./app/middlewares/routeNotFound";
import { router } from "./app/routes";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
import passport from "passport";
import { envVars } from "./app/config/env";
import "./app/config/passport";
import path from "path";

const app = express();

app.set("trust proxy", 1); 

app.use(express.json());

const allowedOrigins = [
  "http://localhost:3000",
  "https://pharmacy-management-sandy.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

app.use(
  expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

const invoiceDir = path.join(__dirname, "app/invoices");
app.use("/invoices", express.static(invoiceDir));

app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Backend Server" });
});

app.use(globalErrorHandler);
app.use(routeNotFound);

export default app;

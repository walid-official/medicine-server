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
import path from "path";

const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:3000",
  "https://pharmacy-management-sandy.vercel.app",
];


app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(expressSession({
  secret: envVars.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());

// ✅ Serve invoice PDFs (correct folder)
const invoiceDir = path.join(__dirname, "app/invoices");
console.log("📂 Serving invoices from:", invoiceDir);
app.use("/invoices", express.static(invoiceDir));

app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Welcome to Backend Server" });
});

app.use(globalErrorHandler);
app.use(routeNotFound);

export default app;

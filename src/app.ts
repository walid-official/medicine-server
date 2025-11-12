import cors from "cors";
import express from "express";
import { globalErrorHandler } from "./app/middlewares/globalErrorHandlers";
import routeNotFound from "./app/middlewares/routeNotFound";
import { router } from "./app/routes";
import cookieParser from "cookie-parser";
import expressSession from "express-session";
// import passport from "passport";
import { envVars } from "./app/config/env";
import "./app/config/passport";
import path from "path";

const app = express();

// 🧠 Proxy trusted (for HTTPS cookies)
app.set("trust proxy", 1);

// 🔹 Allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "https://pharmacy-management-sandy.vercel.app",
];

// 🔹 CORS setup
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// 🔹 Middleware order matters
app.use(express.json());
app.use(cookieParser());

// 🔹 Express session
app.use(
  expressSession({
    secret: envVars.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, 
    cookie: {
      secure: envVars.NODE_ENV === "production",
      sameSite: envVars.NODE_ENV === "production" ? "none" : "lax", 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    },
  })
);

// 🔹 Passport setup
// app.use(passport.initialize());
// app.use(passport.session());

// 🔹 Static + Routes
const invoiceDir = path.join(__dirname, "app/invoices");
app.use("/invoices", express.static(invoiceDir));
app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Backend Server" });
});

// 🔹 Global handlers
app.use(globalErrorHandler);
app.use(routeNotFound);

export default app;

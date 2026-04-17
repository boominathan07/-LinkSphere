import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import express from "express";
import "express-async-errors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { connectDB, isDBConnected } from "./config/db.js";
import apiRoutes from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  process.env.PRODUCTION_CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000"
].filter(Boolean));

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use((req, res, next) => {
  if (req.path === "/api/payment/webhook") {
    return next();
  }
  return express.json({
    verify(innerReq, _res, buf) {
      if (buf && buf.length) {
        innerReq.rawBody = buf;
      }
    }
  })(req, res, next);
});
app.use(cookieParser());
app.use(compression());
app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const authPath = (req.path || "").toLowerCase();
    // Use endsWith or exact match to handle prefixes correctly
    return (
      authPath.endsWith("/refresh") ||
      authPath.endsWith("/logout") ||
      authPath.endsWith("/me") ||
      authPath.endsWith("/verify-email")
    );
  },
  message: { message: "Too many auth attempts. Please wait a few minutes and try again." },
  handler: (_req, res, _next, options) => {
    return res.status(options.statusCode).json(options.message);
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 240 : 1200,
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", (req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({ message: "Database unavailable. Please retry shortly." });
  }
  return next();
});
app.use("/api", apiRoutes);

app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "linksphere-api",
    database: isDBConnected() ? "connected" : "disconnected"
  });
});

app.use((error, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  return res.status(500).json({ message: error.message || "internal server error" });
});

connectDB().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Initial MongoDB connection failed", error.message);
});

setInterval(() => {
  if (!isDBConnected()) {
    connectDB().catch(() => {});
  }
}, 15000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`LinkSphere API running on port ${PORT}`);
});

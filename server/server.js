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

// Allow all origins for now (fix CORS issues)
app.use(
  cors({
    origin: true,  // Allows all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Session-Id"],
    exposedHeaders: ["X-Session-Id"]
  })
);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for now
}));

// Webhook needs raw body
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));

// JSON parsing with raw body capture
app.use((req, res, next) => {
  if (req.path === "/api/payment/webhook") {
    return next();
  }
  return express.json({
    limit: "10mb",
    verify(innerReq, _res, buf) {
      if (buf && buf.length) {
        innerReq.rawBody = buf;
      }
    }
  })(req, res, next);
});

// URL encoded data
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const authPath = (req.path || "").toLowerCase();
    return (
      authPath.endsWith("/refresh") ||
      authPath.endsWith("/logout") ||
      authPath.endsWith("/me") ||
      authPath.endsWith("/verify-email")
    );
  },
  message: { message: "Too many auth attempts. Please wait a few minutes and try again." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 240 : 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." }
});

// Apply rate limiters
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// Database connection middleware
app.use("/api", (req, res, next) => {
  if (!isDBConnected()) {
    return res.status(503).json({ 
      message: "Database unavailable. Please try again shortly.",
      retryAfter: 5 
    });
  }
  return next();
});

// API Routes
app.use("/api", apiRoutes);

// Health check
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "linksphere-api",
    database: isDBConnected() ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: `Route ${req.method} ${req.path} not found`,
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((error, _req, res, _next) => {
  console.error("Global error:", error);
  
  // Handle specific error types
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }
  
  if (error.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }
  
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File too large" });
  }
  
  // Default error
  const status = error.status || 500;
  const message = process.env.NODE_ENV === "production" 
    ? "Internal server error" 
    : error.message;
  
  res.status(status).json({ message });
});

// Connect to database and start server
async function startServer() {
  try {
    await connectDB();
    console.log("✅ Database connected");
    
    app.listen(PORT, () => {
      console.log(`🚀 LinkSphere API running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, closing server...");
  process.exit(0);
});

startServer();

export default app;
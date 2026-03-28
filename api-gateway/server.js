import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken } from "./middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// Global Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "api-gateway" });
});

// Proxy Configuration
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:8001";

// Public Routes
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      "^/api/auth": "/api/auth", // Keep the path the same
    },
    onError: (err, req, res) => {
      console.error("Proxy Error:", err);
      res.status(502).json({ error: "Auth Service is unavailable" });
    },
  }),
);

// Example of a Protected Route Proxy (for future services)
// app.use('/api/users', verifyToken, createProxyMiddleware({
//     target: 'http://localhost:8002',
//     changeOrigin: true,
// }));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Gateway Error:", err.stack);
  res.status(500).json({ error: "Gateway Internal Server Error" });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

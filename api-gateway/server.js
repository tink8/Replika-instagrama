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
const PROXY_TIMEOUT_MS = 10000;

// Global Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));

app.set("trust proxy", 1);

// Rate Limiting (disabled when NODE_ENV=test to avoid flaky integration tests)
const isTest = process.env.NODE_ENV === "test";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
});

app.use(globalLimiter);

const sendGatewayError = (res, status, code, message) => {
  res.status(status).json({
    error: {
      code,
      message,
    },
  });
};

const createServiceProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: PROXY_TIMEOUT_MS,
    timeout: PROXY_TIMEOUT_MS,
    onProxyReq: (proxyReq, req) => {
      if (req.user?.userId) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
      }
    },
    onError: (err, req, res) => {
      console.error("Proxy Error:", err);

      if (res.headersSent) return;

      if (["ETIMEDOUT", "ECONNRESET"].includes(err.code)) {
        return sendGatewayError(
          res,
          504,
          "SERVICE_TIMEOUT",
          "The requested service did not respond in time.",
        );
      }

      return sendGatewayError(
        res,
        502,
        "SERVICE_UNAVAILABLE",
        "The requested service is currently unavailable.",
      );
    },
  });

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "api-gateway" });
});

// Proxy Configuration
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:8001";
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:8002";
const POST_SERVICE_URL =
  process.env.POST_SERVICE_URL || "http://localhost:8003";
const SOCIAL_SERVICE_URL =
  process.env.SOCIAL_SERVICE_URL || "http://localhost:8004";
const FEED_SERVICE_URL =
  process.env.FEED_SERVICE_URL || "http://localhost:8005";
const INTERACTION_SERVICE_URL =
  process.env.INTERACTION_SERVICE_URL || "http://localhost:8006";

// Public Auth Routes (stricter limit — brute-force protection)
app.use("/api/auth", authLimiter, createServiceProxy(AUTH_SERVICE_URL));

// Protected Public API Routes
app.use("/api/users", verifyToken, createServiceProxy(USER_SERVICE_URL));
app.use("/api/posts", verifyToken, createServiceProxy(POST_SERVICE_URL));
app.use(
  "/api/interactions",
  verifyToken,
  createServiceProxy(INTERACTION_SERVICE_URL),
);
app.use("/api/social", verifyToken, createServiceProxy(SOCIAL_SERVICE_URL));
app.use("/api/feed", verifyToken, createServiceProxy(FEED_SERVICE_URL));

app.use((req, res) => {
  sendGatewayError(res, 404, "ROUTE_NOT_FOUND", "Route not found.");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Gateway Error:", err.stack);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Gateway Internal Server Error",
    },
  });
});

const PORT = process.env.PORT || process.env.API_GATEWAY_PORT || 8000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

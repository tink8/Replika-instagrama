import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";
import { errorHandler, AppError } from "./utils/errorHandler.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "user-service" });
});

// Mount Routes
// Note: API Gateway will route /api/users to userRoutes and /internal/users to internalRoutes
app.use("/api/users", userRoutes);
app.use("/internal/users", internalRoutes);

// Catch 404 for undefined routes
app.use("*", (req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      404,
      "ROUTE_NOT_FOUND",
    ),
  );
});

// Global Error Handler (Must be the last middleware)
app.use(errorHandler);

export default app;

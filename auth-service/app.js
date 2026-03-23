import express from "express";
import cors from "cors";

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// Basic Health Check Route (Useful for API Gateway & Docker to check if service is alive)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "auth-service" });
});

// Import and mount actual auth routes
import authRoutes from "./routes/authRoutes.js";
app.use("/api/auth", authRoutes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

export default app;

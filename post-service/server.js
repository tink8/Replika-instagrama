const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const ApiError = require("./utils/ApiError");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "post-service" });
});

// TODO: Mount Post routes here
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/internal", require("./routes/internalRoutes"));

// 404 Handler for unknown routes
app.use((req, res, next) => {
  next(
    new ApiError(404, "NOT_FOUND", "The requested endpoint does not exist."),
  );
});

// Global Error Handler (Strictly follows the API Contract)
app.use(errorHandler);

// Only start the server if this file is run directly (allows Jest to import `app` without starting the server)
if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`Post Service is running on port ${env.port}`);
  });
}

module.exports = app;

import app from "./app.js";
import { config } from "./config/env.js";
import { initMinio } from "./utils/minioClient.js";
import pool from "./utils/db.js"; // Importing to trigger the DB connection test on startup

const startServer = async () => {
  try {
    // Initialize MinIO bucket for avatars
    await initMinio();

    // Start the Express server
    app.listen(config.port, () => {
      console.log(`User Service is running on port ${config.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start User Service:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections globally
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();

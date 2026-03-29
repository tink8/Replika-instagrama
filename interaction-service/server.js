import app from "./app.js";
import { config } from "./config/env.js";
import "./utils/db.js";

const startServer = async () => {
  try {
    app.listen(config.port, () => {
      console.log(`Interaction Service is running on port ${config.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start Interaction Service:", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();

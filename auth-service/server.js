import app from "./app.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Import the database pool to ensure it connects when the server starts
import "./config/db.js";

const PORT = process.env.AUTH_SERVICE_PORT || 8001;

const server = app.listen(PORT, () => {
  console.log(`Auth Service is running on http://localhost:${PORT}`);
});

// Graceful shutdown handling (important for Docker environments)
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

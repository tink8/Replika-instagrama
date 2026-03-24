const express = require("express");
const dotenv = require("dotenv");
const feedRoutes = require("./routes/feed.routes");
const healthRoutes = require("./routes/health.routes");
const authMiddleware = require("./middleware/auth.middleware");
const errorHandler = require("./middleware/errorHandler");

dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.FEED_SERVICE_PORT || 8005;

app.use(express.json());

app.use("/api/feed", authMiddleware, feedRoutes);
app.use("/health", healthRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Feed Service running on port ${PORT}`);
});

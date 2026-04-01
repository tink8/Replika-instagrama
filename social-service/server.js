const express = require("express");
const dotenv = require("dotenv");
const socialRoutes = require("./routes/social.routes");
const internalRoutes = require("./routes/internal.routes");
const healthRoutes = require("./routes/health.routes");
const {
  requireAuth
} = require("./middleware/auth.middleware");
const errorHandler = require("./middleware/errorHandler");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.SOCIAL_SERVICE_PORT || 8004;

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/social", requireAuth, socialRoutes);
app.use("/internal/social", internalRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Social Service running on port ${PORT}`);
});

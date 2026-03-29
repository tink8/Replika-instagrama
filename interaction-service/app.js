import cors from "cors";
import express from "express";
import commentRoutes from "./routes/commentRoutes.js";
import internalInteractionRoutes from "./routes/internalInteractionRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import { AppError, errorHandler } from "./utils/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "interaction-service" });
});

app.use("/api/interactions/likes", likeRoutes);
app.use("/api/interactions/comments", commentRoutes);
app.use("/internal/interactions", internalInteractionRoutes);

app.use("*", (req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      404,
      "ROUTE_NOT_FOUND",
    ),
  );
});

app.use(errorHandler);

export default app;

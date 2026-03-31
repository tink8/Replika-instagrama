import express from "express";
import cors from "cors";
import postRoutes from "./routes/postRoutes.js";
import internalPostRoutes from "./routes/internalPostRoutes.js";
import { errorHandler, AppError } from "./utils/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", service: "post-service" });
});

app.use("/api/posts", postRoutes);
app.use("/internal/posts", internalPostRoutes);

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

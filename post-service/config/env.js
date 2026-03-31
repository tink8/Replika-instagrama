import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const resolveExistingPath = (rawPath, fallbacks = []) => {
  const candidates = [rawPath, ...fallbacks]
    .filter(Boolean)
    .map((candidate) =>
      path.isAbsolute(candidate)
        ? candidate
        : path.resolve(__dirname, "../../", candidate),
    );

  return (
    candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0]
  );
};

let jwtPublicKey = "";
try {
  const keyPath = resolveExistingPath(process.env.JWT_PUBLIC_KEY_PATH, [
    "./keys/public.pem",
    "../keys/public.pem",
  ]);
  jwtPublicKey = fs.readFileSync(keyPath, "utf8");
} catch (error) {
  console.warn(
    "Warning: Could not read JWT public key file. Token verification will fail.",
    error.message,
  );
}

export const config = {
  port: Number(process.env.PORT || process.env.POST_SERVICE_PORT || 8003),

  jwtPublicKey,

  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || process.env.POST_DB_NAME || "post_db",
  },

  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT || 9000),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucketName: process.env.MINIO_POST_BUCKET || "posts",
  },

  services: {
    socialServiceUrl: process.env.SOCIAL_SERVICE_URL || "http://localhost:8004",
    interactionServiceUrl:
      process.env.INTERACTION_SERVICE_URL || "http://localhost:8006",
  },
};

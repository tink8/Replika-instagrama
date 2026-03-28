import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config();

// Read the public key from the file system
let jwtPublicKey = "";
try {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || "../keys/public.pem";
  jwtPublicKey = fs.readFileSync(path.resolve(keyPath), "utf8");
} catch (error) {
  console.warn(
    "Warning: Could not read JWT public key file. Token verification will fail.",
    error.message,
  );
}

export const config = {
  port: process.env.PORT || 3002,

  // JWT Public Key for Zero Trust verification (RS256)
  jwtPublicKey,

  // MySQL Database Configuration
  db: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "user_db",
  },

  // MinIO Configuration for Avatars
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucketName: process.env.MINIO_AVATAR_BUCKET || "avatars",
  },

  // Internal Service URLs for inter-service communication
  services: {
    socialServiceUrl:
      process.env.SOCIAL_SERVICE_URL || "http://social-service:3003",
    postServiceUrl: process.env.POST_SERVICE_URL || "http://post-service:3004",
  },
};

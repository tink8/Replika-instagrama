require("dotenv").config();
const path = require("path");

module.exports = {
  port: process.env.PORT || 8003,

  // MySQL Database
  dbHost: process.env.DB_HOST || "localhost",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASSWORD || "password",
  dbName: process.env.DB_NAME || "insta_posts",
  dbPort: parseInt(process.env.DB_PORT || "3306", 10),

  // MinIO Storage
  minioEndpoint: process.env.MINIO_ENDPOINT || "localhost",
  minioPort: parseInt(process.env.MINIO_PORT || "9000", 10),
  minioUseSSL: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  minioSecretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  minioBucket: process.env.MINIO_BUCKET || "post-media",

  // Security (Zero Trust)
  jwtPublicKeyPath:
    process.env.JWT_PUBLIC_KEY_PATH ||
    path.join(__dirname, "../../keys/public.pem"),

  // Inter-Service URLs
  socialServiceUrl: process.env.SOCIAL_SERVICE_URL || "http://localhost:8004",
  interactionServiceUrl:
    process.env.INTERACTION_SERVICE_URL || "http://localhost:8006",
};

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

const readKey = (rawPath, fallbacks, warningLabel) => {
  try {
    const keyPath = resolveExistingPath(rawPath, fallbacks);
    return fs.readFileSync(keyPath, "utf8");
  } catch (error) {
    console.warn(
      `Warning: Could not read ${warningLabel} key file. ${error.message}`,
    );
    return "";
  }
};

export const config = {
  port: Number(
    process.env.PORT || process.env.INTERACTION_SERVICE_PORT || 8006,
  ),

  jwtPublicKey: readKey(
    process.env.JWT_PUBLIC_KEY_PATH,
    ["./keys/public.pem", "../keys/public.pem"],
    "JWT public",
  ),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "password",
    database:
      process.env.DB_NAME ||
      process.env.INTERACTION_DB_NAME ||
      "interaction_db",
  },

  services: {
    postServiceUrl: process.env.POST_SERVICE_URL || "http://localhost:8003",
    userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:8002",
    socialServiceUrl: process.env.SOCIAL_SERVICE_URL || "http://localhost:8004",
  },
};

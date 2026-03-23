import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load RSA keys
const privateKeyPath = path.join(__dirname, "../../keys/private.pem");
const publicKeyPath = path.join(__dirname, "../../keys/public.pem");

let privateKey, publicKey;
try {
  privateKey = fs.readFileSync(privateKeyPath, "utf8");
  publicKey = fs.readFileSync(publicKeyPath, "utf8");
} catch (error) {
  console.warn("⚠️ RSA Keys not found. Please run the generate-keys script.");
}

/**
 * Generates a short-lived Access Token.
 * @param {string} userId
 * @param {string} username
 * @returns {string} JWT Access Token
 */
export const generateAccessToken = (userId, username) => {
  return jwt.sign({ userId, username }, privateKey, {
    algorithm: "RS256",
    expiresIn: "15m", // 15 minutes
  });
};

/**
 * Generates a long-lived Refresh Token.
 * @param {string} userId
 * @returns {string} JWT Refresh Token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, privateKey, {
    algorithm: "RS256",
    expiresIn: "7d", // 7 days
  });
};

/**
 * Verifies a JWT token.
 * @param {string} token
 * @returns {Object} Decoded token payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
};

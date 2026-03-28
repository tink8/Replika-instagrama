import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load RSA Public Key
const publicKeyPath = path.join(__dirname, "../../keys/public.pem");

let publicKey;
try {
  publicKey = fs.readFileSync(publicKeyPath, "utf8");
} catch (error) {
  console.warn(
    "⚠️ RSA Public Key not found in API Gateway. Please ensure keys are generated.",
  );
}

/**
 * Middleware to verify JWT token
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    req.user = decoded; // Attach user info to the request
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Unauthorized: Token expired" });
    }
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target the /keys directory at the root of the project
const keysDir = path.join(__dirname, "../../keys");
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// Save keys to files
fs.writeFileSync(path.join(keysDir, "public.pem"), publicKey);
fs.writeFileSync(path.join(keysDir, "private.pem"), privateKey);

console.log("✅ RSA Key Pair generated successfully in /keys directory.");

/* DON'T FORGET TO RUN node auth-service/scripts/generate-keys.js
TO GENERATE THE KEYS BEFORE STARTING THE AUTH SERVICE */

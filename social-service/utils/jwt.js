const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

function resolveKeyPath(envName, fallbackRelativePath) {
  const configuredPath = process.env[envName];
  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.resolve(__dirname, fallbackRelativePath);
}

function loadKey(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} key was not found at path: ${filePath}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

const publicKey = loadKey(
  resolveKeyPath("JWT_PUBLIC_KEY_PATH", "../../keys/public.pem"),
  "JWT public"
);

function verifyJwt(token) {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"]
  });
}

module.exports = {
  verifyJwt
};

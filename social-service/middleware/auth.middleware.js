const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

function resolvePublicKeyPath() {
  const configuredPath = process.env.JWT_PUBLIC_KEY_PATH;
  if (configuredPath) {
    return configuredPath;
  }

  return path.resolve(__dirname, "../../keys/public.pem");
}

function loadPublicKey() {
  const publicKeyPath = resolvePublicKeyPath();

  if (!fs.existsSync(publicKeyPath)) {
    throw new Error(`JWT public key nije pronadjen na putanji: ${publicKeyPath}`);
  }

  return fs.readFileSync(publicKeyPath, "utf8");
}

const publicKey = loadPublicKey();

module.exports = function authMiddleware(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";
  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      error: "Nedostaje validan Bearer token."
    });
  }

  try {
    const payload = jwt.verify(token, publicKey, {
      algorithms: ["RS256"]
    });

    const userId = payload.sub || payload.userId || payload.id;
    if (!userId) {
      return res.status(401).json({
        error: "JWT payload ne sadrzi korisnicki identitet."
      });
    }

    req.user = payload;
    req.userId = Number(userId);
    req.headers["x-user-id"] = String(userId);
    return next();
  } catch (error) {
    return res.status(401).json({
      error: "JWT token nije validan.",
      details: error.message
    });
  }
};

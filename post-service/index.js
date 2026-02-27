const express = require("express");
const multer = require("multer");
const path = require("path");
require("dotenv").config({ path: "../.env" });

const app = express();
const PORT = process.env.POST_SERVICE_PORT || 8003; //fallback na 8003

// Konfigurisan multer za upload fajlova i dodat timestamp u ime fajla
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Ovde privremeno čuvamo fajlove, kasnije ćemo ih prebaciti na minio
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Postavljamo limit na veličinu fajla
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB u bajtovima
});

// Test ruta za proveru servisa
app.get("/health", (req, res) => {
  res.json({ status: "Post Service is healthy" });
});

// Ruta za upload fajla (prva verzija)
app.post("/upload", upload.single("media"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send(`File uploaded successfully: ${req.file.filename}`);
});

app.listen(PORT, () => {
  console.log(`Post Service running on port ${PORT}`);
});

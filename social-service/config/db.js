const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config({ path: "../.env" });

const pool = mysql.createPool({
  host: process.env.SOCIAL_DB_HOST || process.env.DB_HOST || "localhost",
  port: Number(process.env.SOCIAL_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.SOCIAL_DB_USER || process.env.DB_USER || "root",
  password:
    process.env.SOCIAL_DB_PASSWORD || process.env.DB_PASSWORD || "admin",
  database: process.env.SOCIAL_DB_NAME || "social_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

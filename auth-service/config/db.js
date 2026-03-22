import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
  uri: process.env.AUTH_DB_URL || "mysql://root:admin@mysql-db:3306/auth_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection immediately
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Connected to MySQL Database (auth_db)");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Error connecting to MySQL Database:", err.message);
  });

export default pool;

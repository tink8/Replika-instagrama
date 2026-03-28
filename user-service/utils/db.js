import mysql from "mysql2/promise";
import { config } from "../config/env.js";

// Create a connection pool
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection on startup
pool
  .getConnection()
  .then((connection) => {
    console.log("Successfully connected to MySQL database.");
    connection.release();
  })
  .catch((err) => {
    console.error("Error connecting to MySQL database:", err.message);
  });

export default pool;

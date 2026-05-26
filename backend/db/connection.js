const mysql = require('mysql2/promise');
require('dotenv').config();

// Aiven requires SSL — this config works for both local and Aiven
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5, // keep low on free tier
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected to Aiven');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
  });

module.exports = pool;

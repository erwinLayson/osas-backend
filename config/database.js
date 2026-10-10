const mysql = require("mysql2");
const { buildDbConfig } = require("./dbConfig.js");

const pool = mysql.createPool(buildDbConfig({ connectionLimit: 10 }));

// Verify pool can get a connection on startup
pool.getConnection((err, conn) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }
    console.log("Database connection successful");
    conn.release();
});

module.exports = pool;
const mysql = require("mysql2");
const { getEnv, isProduction } = require("../helper/getEnVName.js");

const pool = mysql.createPool({
    host: getEnv("HOST"),
    user: getEnv("USER"),
    password: getEnv("PASSWORD"),
    database: getEnv("DATABASE_NAME"),
    port: Number(getEnv("DB_PORT")),
    connectionLimit: 10,

    ...(isProduction() && {
        ssl: {
            rejectUnauthorized: true,
        },
    }),
});

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
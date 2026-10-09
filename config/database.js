const mysql = require("mysql2");
const { getEnv, isProduction } = require("../helper/getEnVName.js");

const db = mysql.createConnection({
    host: getEnv("HOST"),
    user: getEnv("USER"),
    password: getEnv("PASSWORD"),
    database: getEnv("DATABASE_NAME"),
    port: Number(getEnv("DB_PORT")),

    ...(isProduction() && {
        ssl: {
            rejectUnauthorized: true,
        },
    }),
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Database connection successful");
});

module.exports = db;
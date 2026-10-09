const mysql = require("mysql2");
const { getEnvName } = require("../helper/getEnVName.js");

const db = mysql.createConnection({
    host: getEnvName("HOST"),
    user: getEnvName("USER"),
    password: getEnvName("PASSWORD"),
    database: getEnvName("DATABASE_NAME"),

    ...(getEnvName("NODE_ENV") === "production" && {
        ssl: {
            minVersion: "TLSv1.2",
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
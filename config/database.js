const mysql = require('mysql2');
const {getEnvName} = require("../helper/getEnVName.js")

const db = mysql.createConnection({
    host: getEnvName("HOST"),
    user: getEnvName("USER"),
    password: getEnvName("PASSWORD"),
    database: getEnvName("DATABASE_NAME")
});

db.connect((err) => {
    if (err) return console.log("Database connection failed", err);

    console.log("Database connection successfull");
})

module.exports = db;
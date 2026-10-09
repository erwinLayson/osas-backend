const mysql = require('mysql2');

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "osas_database"
});

db.connect((err) => {
    if (err) return console.log("Database connection failed", err);

    console.log("Database connection successfull");
})

module.exports = db;
const db = require("../config/database")

class Appicant_history {
    static create(data, callback) {
        const { name, email, subjects, status } = data;
        const sql = "INSERT INTO applicant_history(name, email, subjects, status) VALUES(?, ?, ?, ?)";
        db.query(sql, [name, email, subjects, status], callback);
    }

    static getAll(callback) {
        const sql = "SELECT * FROM applicant_history";
        db.query(callback);
    } 

    static getById(id, callback) {
        const sql = "SELECT * FROM applicant_history WHERE id = ?";
        db.query(sql, [id], callback);
    }

    static update(id, data, callback) {
        const sql = "UPDATE applicant_history SET name = ?, email = ?, status = ? WHERE id = ?";
        db.query * (sql, [data], callback);
    }

    static delete(id, callback) {
        const sql = "DELETE FROM applicant_history WHERE id = ?";
        db.query(sql, callback);
    }
}

module.exports = Appicant_history;
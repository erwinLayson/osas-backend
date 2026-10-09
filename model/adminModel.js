const bcrypt = require('bcrypt');

const db = require("../config/database");

class Admin {
    static async create(data,callback) {
        const { username, email, password } = data;


        if (username == '' || email == '' || password == '') {
            return {message: "fill up all fields", success: false}
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO admins(username, email, password) VALUES(?, ?, ?)";
        db.query(sql, [username, email, hashPassword], callback);
    }

    static getAll(callback) {
        const sql = "SELECT * FROM admins";
        db.query(sql, callback);
    }

    static getByUsername(username, callback) {
        const sql = "SELECT * FROM admins where username = ?";
        db.query(sql, [username], callback);
    }

    static getByEmail(email, callback) {
        const sql = "SELECT * FROM admins WHERE email = ?";
        db.query(sql, [email], callback);
    }

    static update(newPassword,callback) {
        const sql = "UPDATE admins SET password = ?";
        const hashNewPassword = bcrypt.hashSync(newPassword, 10);
        db.query(sql, [hashNewPassword], callback);
        
    }

    static deleteAdmin(id, callback) {
        const sql = "DELETE FROM admins where id = ?";
        db.query(sql, callback);
    }

}

module.exports = Admin;
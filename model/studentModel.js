const db = require("../config/database");
const bcrypt = require("bcrypt");

class Students {
  
  static createStudent(data, callback) {
    const { username, name, email, subjects, password } = data;
    this.getStudentByUsername(username, (err, student) => {

      if (err) {
        console.log("database err: ", err);
        return callback(err, null);
      }
    
      if (student.length > 0) {
        return callback(new Error("student username already exists"), null);
      }
      this.getStudentByEmail(email, (error, result) => {
        if (error) {
          console.log("databse error", error)
          return callback(error.message, null);
        }

        if (result.length > 0) {
          return callback(new Error("Student email already exist"), null)
        }
        const hashPassword = bcrypt.hashSync(password, 10)
        const sql = "INSERT INTO students(username, name, email, subjects, password) VALUES(?,?,?,?,?) ";
        db.query(sql, [username, name, email, subjects, hashPassword], callback);
      })
    });
  } 
  
  static getAllStudent(callback) {
    const sql = "SELECT * FROM students";
    db.query(sql, callback);
  }

  static getStudentByUsername(username, callback) {
    const search = "SELECT * FROM students WHERE username = ?";
    db.query(search, [username], callback);
  }

  static getStudentByEmail(email, callback) {
    const search = "SELECT * FROM students WHERE email = ?";
    db.query(search, [email], callback);
  }

  static updateStudent(id, updateData, callback) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    const sql = `UPDATE students SET ${fields} WHERE id = ?`;
    db.query(sql, [...values, id], callback);
  }

  static deleteStudent(id, callback) {
    const sql = "DELETE FROM students WHERE id = ?";
    db.query(sql, [id], callback);
  }
}

module.exports = Students;
const db = require('../config/database');

class applicants {
  // Create a new student
  static create(studentData, callback) {
    const { studentName, email, subjects } = studentData;
    const subjectsJson = JSON.stringify(subjects);
    
    const query = 'INSERT INTO applicants (student_name, email, subjects, created_at) VALUES (?, ?, ?, NOW())';
    db.query(query, [studentName, email, subjectsJson], callback);
  }

  // Get all students
  static getAll(callback) {
    const query = 'SELECT * FROM applicants ORDER BY created_at DESC';
    db.query(query, callback);
  }

  // Get student by ID
  static getById(id, callback) {
    const query = 'SELECT * FROM applicants WHERE id = ?';
    db.query(query, [id], callback);
  }

  // Get student by email
  static getByEmail(email, callback) {
    const query = 'SELECT * FROM applicants WHERE email = ?';
    db.query(query, [email], callback);
  }

  // Update student
  static update(id, studentData, callback) {
    const { studentName, email, subjects } = studentData;
    const subjectsJson = JSON.stringify(subjects);
    
    const query = 'UPDATE applicants SET student_name = ?, email = ?, subjects = ?, updated_at = NOW() WHERE id = ?';
    db.query(query, [studentName, email, subjectsJson, id], callback);
  }

  // Delete student
  static delete(id, callback) {
    const query = 'DELETE FROM applicants WHERE id = ?';
    db.query(query, [id], callback);
  }

  // Search students by name or email
  static search(searchTerm, callback) {
    const query = 'SELECT * FROM applicants WHERE student_name LIKE ? OR email LIKE ? ORDER BY created_at DESC';
    const searchPattern = `%${searchTerm}%`;
    db.query(query, [searchPattern, searchPattern], callback);
  }
}

module.exports = applicants;
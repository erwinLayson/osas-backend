const db = require('../config/database');

class ScholarshipApplication {
  static create(applicationData, callback) {
    const { student_id, scholarship_id, documents } = applicationData;
    const docsJson = JSON.stringify(documents || []);
    const query = `INSERT INTO scholarship_applications (student_id, scholarship_id, documents, status, created_at) VALUES (?, ?, ?, 'Pending', NOW())`;
    db.query(query, [student_id, scholarship_id, docsJson], callback);
  }

  static getByStudent(student_id, callback) {
    const query = `SELECT a.*, s.name AS scholarship_name, s.amount AS scholarship_amount, s.status AS scholarship_status,
                   st.name AS student_name, st.email AS email
                   FROM scholarship_applications a
                   LEFT JOIN scholarships s ON a.scholarship_id = s.id
                   LEFT JOIN students st ON a.student_id = st.id
                   WHERE a.student_id = ?
                   ORDER BY a.created_at DESC`;
    db.query(query, [student_id], callback);
  }

  static getByScholarship(scholarship_id, callback) {
    const query = 'SELECT * FROM scholarship_applications WHERE scholarship_id = ? ORDER BY created_at DESC';
    db.query(query, [scholarship_id], callback);
  }

  static getByStudentAndScholarship(student_id, scholarship_id, callback) {
    const query = 'SELECT * FROM scholarship_applications WHERE student_id = ? AND scholarship_id = ? LIMIT 1';
    db.query(query, [student_id, scholarship_id], callback);
  }

  static getById(id, callback) {
    const query = `SELECT a.*, s.name AS scholarship_name, st.name AS student_name, st.email AS email, st.subjects AS subjects
                   FROM scholarship_applications a
                   LEFT JOIN scholarships s ON a.scholarship_id = s.id
                   LEFT JOIN students st ON a.student_id = st.id
                   WHERE a.id = ?`;
    db.query(query, [id], callback);
  }

  static getAll(callback) {
    const query = `SELECT a.*, s.name AS scholarship_name,
               st.name AS student_name,
               st.email AS email,
               st.subjects AS subjects
             FROM scholarship_applications a
             LEFT JOIN scholarships s ON a.scholarship_id = s.id
             LEFT JOIN students st ON a.student_id = st.id
             ORDER BY a.created_at DESC`;
    db.query(query, callback);
  }

  static updateStatus(id, status, callback) {
    const query = 'UPDATE scholarship_applications SET status = ? WHERE id = ?';
    db.query(query, [status, id], callback);
  }

  static moveToHistory(id, status, callback) {
    // First get the application data
    const selectQuery = `SELECT * FROM scholarship_applications WHERE id = ?`;
    db.query(selectQuery, [id], (err, rows) => {
      if (err) return callback(err);
      if (!rows || rows.length === 0) return callback(new Error('Application not found'));
      
      const app = rows[0];
      // Insert into history table
      const insertQuery = `INSERT INTO scholarship_applications_history 
        (original_id, student_id, scholarship_id, documents, status, created_at, processed_at) 
        VALUES (?, ?, ?, ?, ?, ?, NOW())`;
      
      db.query(insertQuery, [app.id, app.student_id, app.scholarship_id, app.documents, status, app.created_at], (insertErr) => {
        if (insertErr) return callback(insertErr);
        
        // Delete from active applications table
        const deleteQuery = `DELETE FROM scholarship_applications WHERE id = ?`;
        db.query(deleteQuery, [id], callback);
      });
    });
  }

  static getHistory(callback) {
    const query = `SELECT h.*, s.name AS scholarship_name, st.name AS student_name, st.email AS email
      FROM scholarship_applications_history h
      LEFT JOIN scholarships s ON h.scholarship_id = s.id
      LEFT JOIN students st ON h.student_id = st.id
      ORDER BY h.processed_at DESC`;
    db.query(query, callback);
  }

  static getHistoryByStudent(student_id, callback) {
    const query = `SELECT h.*, s.name AS scholarship_name, s.amount AS scholarship_amount
      FROM scholarship_applications_history h
      LEFT JOIN scholarships s ON h.scholarship_id = s.id
      WHERE h.student_id = ?
      ORDER BY h.processed_at DESC`;
    db.query(query, [student_id], callback);
  }
}

module.exports = ScholarshipApplication;

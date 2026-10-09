const db = require('../config/database');

class Scholarship {
  // Create a new scholarship
  static create(scholarshipData, callback) {
    const { name, description, amount, slots, requirements, deadline, status } = scholarshipData;
    const query = `INSERT INTO scholarships (name, description, amount, slots, requirements, deadline, status) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [name, description, amount, slots, requirements, deadline, status || 'Active'], callback);
  }

  // Get all scholarships
  static getAll(callback) {
    const query = `
      SELECT s.*, 
        (s.slots - IFNULL((SELECT COUNT(*) FROM scholarship_applications a WHERE a.scholarship_id = s.id AND a.status = 'Approved'), 0)) AS available_slots
      FROM scholarships s
      ORDER BY s.created_at DESC
    `;
    db.query(query, callback);
  }

  // Get scholarship by ID
  static getById(id, callback) {
    const query = `
      SELECT s.*, 
        (s.slots - IFNULL((SELECT COUNT(*) FROM scholarship_applications a WHERE a.scholarship_id = s.id AND a.status = 'Approved'), 0)) AS available_slots
      FROM scholarships s
      WHERE s.id = ?
    `;
    db.query(query, [id], callback);
  }

  // Update scholarship
  static update(id, scholarshipData, callback) {
    const { name, description, amount, slots, requirements, deadline, status } = scholarshipData;
    const query = `UPDATE scholarships 
                   SET name = ?, description = ?, amount = ?, slots = ?, 
                       requirements = ?, deadline = ?, status = ?, updated_at = NOW() 
                   WHERE id = ?`;
    db.query(query, [name, description, amount, slots, requirements, deadline, status, id], callback);
  }

  // Delete scholarship
  static delete(id, callback) {
    const query = 'DELETE FROM scholarships WHERE id = ?';
    db.query(query, [id], callback);
  }

  // Search scholarships
  static search(searchTerm, callback) {
    const query = `SELECT * FROM scholarships 
                   WHERE name LIKE ? OR description LIKE ? 
                   ORDER BY created_at DESC`;
    const searchPattern = `%${searchTerm}%`;
    db.query(query, [searchPattern, searchPattern], callback);
  }

  // Get scholarships by status
  static getByStatus(status, callback) {
    const query = 'SELECT * FROM scholarships WHERE status = ? ORDER BY created_at DESC';
    db.query(query, [status], callback);
  }
}

module.exports = Scholarship;

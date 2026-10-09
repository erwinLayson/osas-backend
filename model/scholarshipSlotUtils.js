const db = require('../config/database');

// Reduce available slots for a scholarship by a given count
function reduceAvailableSlots(scholarshipId, count, callback) {
  const query = 'UPDATE scholarships SET available_slots = GREATEST(available_slots - ?, 0) WHERE id = ?';
  db.query(query, [count, scholarshipId], callback);
}

module.exports = { reduceAvailableSlots };
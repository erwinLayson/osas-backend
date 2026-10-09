const db = require('../config/database');

const Settings = {
  getByKey: (key, cb) => {
    const q = 'SELECT * FROM settings WHERE setting_key = ? LIMIT 1';
    db.query(q, [key], (err, result) => cb(err, result));
  },

  upsert: (key, value, cb) => {
    const q = `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`;
    db.query(q, [key, value], (err, result) => cb(err, result));
  }
};

module.exports = Settings;
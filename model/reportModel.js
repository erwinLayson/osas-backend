const db = require('../config/database');

class Reports {
  static create(report, callback) {
    const { name, type, generated_by, filename, size_bytes, status } = report;
    const sql = `INSERT INTO reports (name, type, generated_by, filename, size_bytes, status) VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [name, type, generated_by, filename, size_bytes || 0, status || 'Ready'], callback);
  }

  static getSummary(callback) {
    // Run queries sequentially to avoid needing `multipleStatements` driver option
    const qTotal = `SELECT COUNT(*) AS total_this_month FROM reports WHERE MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE())`;
    const qStorage = `SELECT COALESCE(SUM(size_bytes),0) AS storage_bytes FROM reports`;
    const qLast = `SELECT id,name,type,generated_by,filename,size_bytes,created_at FROM reports ORDER BY created_at DESC LIMIT 1`;
    const qMost = `SELECT type, COUNT(*) AS cnt FROM reports WHERE MONTH(created_at)=MONTH(CURRENT_DATE()) AND YEAR(created_at)=YEAR(CURRENT_DATE()) GROUP BY type ORDER BY cnt DESC LIMIT 1`;

    db.query(qTotal, (err, resTotal) => {
      if (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') return callback(null, { total_this_month: 0, storage_bytes: 0, lastGenerated: null, mostGenerated: null });
        return callback(err);
      }
      db.query(qStorage, (err2, resStorage) => {
        if (err2) {
          if (err2.code === 'ER_NO_SUCH_TABLE') return callback(null, { total_this_month: 0, storage_bytes: 0, lastGenerated: null, mostGenerated: null });
          return callback(err2);
        }
        db.query(qLast, (err3, resLast) => {
          if (err3) {
            if (err3.code === 'ER_NO_SUCH_TABLE') return callback(null, { total_this_month: 0, storage_bytes: 0, lastGenerated: null, mostGenerated: null });
            return callback(err3);
          }
          db.query(qMost, (err4, resMost) => {
            if (err4) {
              if (err4.code === 'ER_NO_SUCH_TABLE') return callback(null, { total_this_month: 0, storage_bytes: 0, lastGenerated: null, mostGenerated: null });
              return callback(err4);
            }
            const total_this_month = resTotal && resTotal[0] ? resTotal[0].total_this_month : 0;
            const storage_bytes = resStorage && resStorage[0] ? resStorage[0].storage_bytes : 0;
            const lastGenerated = resLast && resLast[0] ? resLast[0] : null;
            const mostGenerated = resMost && resMost[0] ? resMost[0] : null;
            return callback(null, { total_this_month, storage_bytes, lastGenerated, mostGenerated });
          });
        });
      });
    });
  }

  static getRecent(limit = 10, callback) {
    const sql = `SELECT id,name,type,generated_by,filename,size_bytes,status,created_at FROM reports ORDER BY created_at DESC LIMIT ?`;
    db.query(sql, [limit], callback);
  }

  static getById(id, callback) {
    const sql = `SELECT * FROM reports WHERE id = ? LIMIT 1`;
    db.query(sql, [id], callback);
  }

  static deleteById(id, callback) {
    const sql = `DELETE FROM reports WHERE id = ?`;
    db.query(sql, [id], callback);
  }
}

module.exports = Reports;

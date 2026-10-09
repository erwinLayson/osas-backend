const db = require('../config/database');

// Table layout (migration 008/009/010):
//   id (PK, grade-row id), studentId, studentName, subjects (text),
//   created_at (timestamp), session_id, semester, average
const RecentGrades = {
    // data: { studentId, studentName, subjects, semester, average, sessionId }
    addRecentGrade: (data, cb) => {
        const { studentId, studentName, subjects, semester, average, sessionId } = data;
        const grades = typeof subjects === 'string' ? subjects : JSON.stringify(subjects);
        const sql = 'INSERT INTO recent_grades (`studentId`, `studentName`, `subjects`, `semester`, `average`, `session_id`) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [studentId, studentName || null, grades, semester || null, typeof average !== 'undefined' ? average : null, sessionId || null], cb);
    },

    getStudentRecentGrades: (studentId, cb) => {
        const sql = 'SELECT * FROM recent_grades WHERE `studentId` = ? ORDER BY created_at DESC';
        db.query(sql, [studentId], cb);
    },

    getAllRecentGrades: (cb) => {
        const sql = 'SELECT * FROM recent_grades ORDER BY created_at DESC';
        db.query(sql, cb);
    },

    getByStudentAndSemester: (studentId, semester, cb) => {
        const sql = 'SELECT * FROM recent_grades WHERE `studentId` = ? AND `semester` = ? LIMIT 1';
        db.query(sql, [studentId, semester], cb);
    },

    getByStudentAndSession: (studentId, sessionId, cb) => {
        const sql = 'SELECT * FROM recent_grades WHERE `studentId` = ? AND `session_id` = ? LIMIT 1';
        db.query(sql, [studentId, sessionId], cb);
    },

    deleteRecentGrade: (recentGradeId, cb) => {
        const sql = 'DELETE FROM recent_grades WHERE id = ?';
        db.query(sql, [recentGradeId], cb);
    }
};

module.exports = RecentGrades;

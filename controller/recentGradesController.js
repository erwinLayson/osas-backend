const RecentGrades = require('../model/recent_grades');
const { sendError } = require('../middleware/errorHandler');

const recentGradesController = {
  getAll: (req, res) => {
    RecentGrades.getAllRecentGrades((err, result) => {
      if (err) return sendError(res, err, 500);
      return res.status(200).json({ message: 'OK', success: true, data: result });
    });
  },

  getByStudent: (req, res) => {
    const studentId = req.params.studentId;
    if (!studentId) return sendError(res, 'Missing studentId', 400);
    RecentGrades.getStudentRecentGrades(studentId, (err, result) => {
      if (err) return sendError(res, err, 500);
      return res.status(200).json({ message: 'OK', success: true, data: result });
    });
  },

  // Student-scoped: get recent grades for the authenticated student
  getForCurrent: (req, res) => {
    const studentId = req.user && req.user.id;
    if (!studentId) return sendError(res, 'Unauthorized', 401);
    RecentGrades.getStudentRecentGrades(studentId, (err, result) => {
      if (err) return sendError(res, err, 500);
      return res.status(200).json({ message: 'OK', success: true, data: result });
    });
  }
};

module.exports = recentGradesController;

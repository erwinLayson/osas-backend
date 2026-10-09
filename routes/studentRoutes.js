const express = require('express');

// controller
const studentController = require('../controller/studentController');

// middle ware
const { authenticateStudent, authenticateAdmin, requireRole } = require("../authenticate/auth");

const route = express.Router();

// Admin-only student management
route.post('/create', authenticateAdmin, requireRole('admin'), studentController.createStudent);
route.post('/reject', authenticateAdmin, requireRole('admin'), studentController.rejectStudent);
route.get('/student_list', authenticateAdmin, requireRole('admin'), studentController.getAll);
route.put('/edit/:id', authenticateAdmin, requireRole('admin'), studentController.editStudent);
// Admin delete student
route.delete('/:id', authenticateAdmin, requireRole('admin'), studentController.deleteStudent);

// student routes authenticate
route.get('/profile', authenticateStudent, requireRole('student'), studentController.getProfile);
// Student self-service routes
route.put('/profile', authenticateStudent, requireRole('student'), studentController.updateProfile);
route.post('/profile/password', authenticateStudent, requireRole('student'), studentController.changePassword);

// Student can view their own recent grades history
const recentGradesController = require('../controller/recentGradesController');
route.get('/recent-grades', authenticateStudent, requireRole('student'), recentGradesController.getForCurrent);

module.exports = route;
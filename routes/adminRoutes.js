const express = require("express");
const adminController = require('../controller/adminController');
const { authenticateAdmin, requireRole } = require('../authenticate/auth');

const adminRoutes = express.Router();

// Public Routes - Authentication (login/logout live under /auth)
adminRoutes.get('/verify', authenticateAdmin, requireRole('admin'), adminController.verifyToken);

// Protected Routes - Require Authentication + Admin Role
adminRoutes.post('/profile', authenticateAdmin, requireRole('admin'), adminController.getAdmin);
adminRoutes.put('/password', authenticateAdmin, requireRole('admin'), adminController.update);
adminRoutes.post('/create', authenticateAdmin, requireRole('admin'), adminController.create);
adminRoutes.get('/admin_list', authenticateAdmin, requireRole('admin'), adminController.getAllAdmins);
adminRoutes.get('/applicants', authenticateAdmin, requireRole('admin'), adminController.getAllApplicants)
adminRoutes.get('/dashboard-stats', authenticateAdmin, requireRole('admin'), adminController.getDashboardStats)
const recentGradesController = require('../controller/recentGradesController');

// Recent grades history for admins
adminRoutes.get('/recent-grades', authenticateAdmin, requireRole('admin'), recentGradesController.getAll);
adminRoutes.get('/recent-grades/:studentId', authenticateAdmin, requireRole('admin'), recentGradesController.getByStudent);

module.exports = adminRoutes;

const express = require('express');
const router = express.Router();
const settingsController = require('../controller/settingsController');
const { authenticateAdmin, requireRole } = require('../authenticate/auth');

// Maintenance mode - public read for login pages
router.get('/maintenance_mode', settingsController.getMaintenanceMode);
// Admin update for maintenance mode
router.put('/maintenance_mode', authenticateAdmin, requireRole('admin'), settingsController.setMaintenanceMode);

// Public read - students can check if editing is allowed
router.get('/allow_grade_edit', settingsController.getAllowGradeEdit);
// Admin update
router.put('/allow_grade_edit', authenticateAdmin, requireRole('admin'), settingsController.setAllowGradeEdit);

module.exports = router;

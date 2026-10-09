const express = require('express');
const router = express.Router();
const ReportController = require('../controller/reportController');
const { authenticateAdmin, requireRole } = require('../authenticate/auth');

// Generate report (admin only)
router.post('/generate', authenticateAdmin, requireRole('admin'), ReportController.generateReport);

// Summary and recent reports
router.get('/summary', authenticateAdmin, requireRole('admin'), ReportController.getSummary);
router.get('/recent', authenticateAdmin, requireRole('admin'), ReportController.getRecent);

// Download and delete generated reports
router.get('/download/:id', authenticateAdmin, requireRole('admin'), ReportController.downloadReport);
router.delete('/:id', authenticateAdmin, requireRole('admin'), ReportController.deleteReport);

module.exports = router;

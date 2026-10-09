const express = require('express');
const ScholarshipController = require('../controller/scholarshipController');
const ScholarshipApplicationController = require('../controller/scholarshipApplicationController');
const { authenticateAdmin, authenticateStudent, requireRole } = require('../authenticate/auth');
const multer = require('multer');

// multer temp storage
const upload = multer({ dest: 'tmp/' });

const scholarshipRoutes = express.Router();

// Public route - accessible to all
scholarshipRoutes.get('/list', ScholarshipController.getAll);

// Admin-only routes
scholarshipRoutes.post('/create', authenticateAdmin, requireRole('admin'), ScholarshipController.create);
// Admin: manage scholarship applications
scholarshipRoutes.get('/applications', authenticateAdmin, requireRole('admin'), ScholarshipApplicationController.listAll);
scholarshipRoutes.get('/applications/history', authenticateAdmin, requireRole('admin'), ScholarshipApplicationController.listHistory);
scholarshipRoutes.get('/applications/:id', authenticateAdmin, requireRole('admin'), ScholarshipApplicationController.getById);
scholarshipRoutes.put('/applications/:id/status', authenticateAdmin, requireRole('admin'), ScholarshipApplicationController.updateStatus);
scholarshipRoutes.get('/applications/:id/document/:index', authenticateAdmin, requireRole('admin'), ScholarshipApplicationController.downloadDocument);

// Student: view their applications
scholarshipRoutes.get('/my-applications', authenticateStudent, requireRole('student'), ScholarshipApplicationController.listByStudent);
scholarshipRoutes.get('/my-applications/history', authenticateStudent, requireRole('student'), ScholarshipApplicationController.listHistoryByStudent);

// Scholarship CRUD
scholarshipRoutes.get('/:id', authenticateAdmin, requireRole('admin'), ScholarshipController.getById);
scholarshipRoutes.put('/edit/:id', authenticateAdmin, requireRole('admin'), ScholarshipController.update);
scholarshipRoutes.delete('/delete/:id', authenticateAdmin, requireRole('admin'), ScholarshipController.delete);

// Student apply route (multipart/form-data, files field name: documents)
scholarshipRoutes.post('/apply/:id', authenticateStudent, requireRole('student'), upload.array('documents', 10), ScholarshipApplicationController.apply);

module.exports = scholarshipRoutes;

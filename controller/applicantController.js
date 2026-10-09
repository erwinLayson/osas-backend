const Appicant_history = require('../model/applicant_historyModel');
const applicants = require('../model/applicantsModel');
const settingsController = require('./settingsController');
const { sendError } = require('../middleware/errorHandler');

const applicantsController = {
  // Create a new student
  createApplicant: (req, res) => {
        // Check maintenance mode first
        settingsController.checkMaintenanceMode((err, isMaintenanceMode) => {
            if (err) {
                console.error('Error checking maintenance mode:', err);
            }
            if (isMaintenanceMode) {
                return sendError(res, 'System is under maintenance. Registration is temporarily disabled.', 503);
            }

            const { studentName, email, subjects } = req.body;

        // Validation
        if (!studentName || !email || !subjects) {
            return sendError(res, 'Please provide all required fields: studentName, email, and subjects', 400);
        }

            // Enforce SKSU email domain
            const sksuRegex = /^[\w.+-]+@sksu\.edu\.ph$/i;
            if (!sksuRegex.test((email || '').trim())) {
                return sendError(res, 'Only sksu.edu.ph email addresses are allowed', 400);
            }

            // Check if email already exists
            applicants.getByEmail(email, (err, results) => {
            if (err) {
                return sendError(res, err, 500);
            }

            if (results.length > 0) {
                return sendError(res, 'Email already exists', 409, { isDuplicate: true });
            }

            // Create student
            const studentData = { studentName, email, subjects };
            
            applicants.create(studentData, (err, result) => {
                if (err) {
                        return sendError(res, err, 500);
                    }

                    res.status(201).json({
                    success: true,
                    message: 'Student registered successfully',
                    data: {
                        id: result.insertId,
                        studentName,
                        email,
                        subjects
                    }
                });
            });
        });
        }); // end maintenance mode check
    },

};

module.exports = applicantsController;

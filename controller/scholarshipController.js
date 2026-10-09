const { sendScholarshipMail } = require('./shared/mailer');
const Student = require('../model/studentModel');
const { sendError } = require('../middleware/errorHandler');

const Scholarship = require('../model/scholarshipModel');

class ScholarshipController {
    // Create a new scholarship
    static create(req, res) {
        const scholarshipData = req.body;
        
        // Validate required fields
        if (!scholarshipData.name || !scholarshipData.description || !scholarshipData.amount || 
            !scholarshipData.slots || !scholarshipData.deadline) {
            return sendError(res, 'All fields are required', 400);
        }

        Scholarship.create(scholarshipData, (err, result) => {
            if (err) {
                console.error('Error creating scholarship:', err);
                return sendError(res, err, 500);
            }

            Student.getAllStudent((err, result) => {
                if (err) return sendError(res, err, 500);

                const studentsEmail = result.map(student => student.email);
                console.log(studentsEmail);

                sendScholarshipMail("New scholarship posted", studentsEmail, "Provide the requirement to apply the scholarship program");
                res.status(201).json({ 
                message: "Scholarship created successfully", 
                success: true,
                scholarshipId: result.insertId
            });
            })
        });
    }

    // Get all scholarships
    static getAll(req, res) {
        Scholarship.getAll((err, scholarships) => {
            if (err) {
                console.error('Error fetching scholarships:', err);
                return sendError(res, err, 500);
            }

            res.status(200).json({ 
                message: "Scholarships retrieved successfully", 
                success: true, 
                data: scholarships 
            });
        });
    }

    // Get scholarship by ID
    static getById(req, res) {
        const { id } = req.params;

        Scholarship.getById(id, (err, scholarship) => {
            if (err) {
                console.error('Error fetching scholarship:', err);
                return sendError(res, err, 500);
            }

            if (scholarship.length === 0) {
                return sendError(res, 'Scholarship not found', 404);
            }

            res.status(200).json({ 
                message: "Scholarship retrieved successfully", 
                success: true, 
                data: scholarship[0] 
            });
        });
    }

    // Update scholarship
    static update(req, res) {
        const { id } = req.params;
        const scholarshipData = req.body;

        Scholarship.update(id, scholarshipData, (err, result) => {
            if (err) {
                console.error('Error updating scholarship:', err);
                return sendError(res, err, 500);
            }

            if (result.affectedRows === 0) {
                return sendError(res, 'Scholarship not found', 404);
            }

            res.status(200).json({ 
                message: "Scholarship updated successfully", 
                success: true 
            });
        });
    }

    // Delete scholarship
    static delete(req, res) {
        const { id } = req.params;

        Scholarship.delete(id, (err, result) => {
            if (err) {
                console.error('Error deleting scholarship:', err);
                return sendError(res, err, 500);
            }

            if (result.affectedRows === 0) {
                return sendError(res, 'Scholarship not found', 404);
            }

            res.status(200).json({ 
                message: "Scholarship deleted successfully", 
                success: true 
            });
        });
    }
}

module.exports = ScholarshipController;

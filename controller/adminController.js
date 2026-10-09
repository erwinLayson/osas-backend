const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');
const { sendError } = require('../middleware/errorHandler');

const admin = require("../model/adminModel");
const applicants = require('../model/applicantsModel');
const student = require("../model/studentModel");

class adminController {
    static getAdmin(req, res) {
        const { username } = req.body;
        
        if (!username) {
            return sendError(res, 'Username is required', 400);
        }
        
        admin.getByUsername(username, (err, data) => {
            if(err) return sendError(res, err, 500);

            res.status(200).json({ message: "admin get success", success: true, data: data });
        })
    }

    static verifyToken(req, res) {
        const SECRET_KEY = getEnv('ADMIN_LOGIN_SECRET_KEY');
        const token = req.cookies.adminLogin;

        if (!token) {
            return sendError(res, 'Not authenticated', 401);
        }

        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            res.status(200).json({ message: "Authenticated", success: true, user: decoded });
        } catch (err) {
            return sendError(res, 'Invalid or expired token', 401);
        }
    }

    static create(req, res) {
        const data = req.body;
        const isFill = Object.keys(data).every(key => (
            data[key] !== "" && data[key] !== null
        ));

        if (!isFill) {
            return sendError(res, 'Fill up all fields', 400);
        }            admin.getByEmail(data.email, (err, result) => {
                if (err) return sendError(res, err, 500);

                if (result.length > 0) {
                    return sendError(res, 'Email already exists', 409, { isDuplicate: true });
                }

            admin.create(data, (error) => {
                if (error) return sendError(res, error, 500);

                res.status(201).json({message: "Account created successfully", success: true})
            })
        })
    }

    static getAllAdmins(req, res) {
        admin.getAll((err, data) => {
            if(err) return sendError(res, err, 500);

            res.status(200).json({ message: "Admins retrieved successfully", success: true, data: data });
        })
    }

    static update(req, res) {
        const { password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return sendError(res, 'Password not match', 400);
        }
        admin.update(password, (err, data) => {
            if (err) return sendError(res, err, 500);

            if (data.changedRows == 0) {
                res.status(201).json({ message: "No Update happen", success: true, data: data });
            }

            if (data.changedRows > 0) {
                res.status(201).json({ message: "Update Successfull", success: true, data: data });
            }
        });
    }

    static getAllApplicants (req, res) {
        applicants.getAll((err, data) => {
            if (err) return sendError(res, err, 500);

            res.status(200).json(data);
        }) 
    }

    static getDashboardStats(req, res) {
        // Get total students count
        student.getAllStudent((err, students) => {
            if (err) {
                console.error('Error fetching students:', err);
                return sendError(res, err, 500);
            }

            // Get all applicants
            applicants.getAll((err2, applications) => {
                if (err2) {
                    console.error('Error fetching applicants:', err2);
                    return sendError(res, err2, 500);
                }

                const stats = {
                    totalStudents: students.length,
                    totalApplications: applications.length,
                    pendingApplications: applications.length, // All applicants are pending until approved/rejected
                    approvedApplications: students.length, // Students are approved applicants
                };

                // Get recent applications (last 5)
                const recentApplications = applications.slice(0, 5).map(app => {
                    let date = new Date().toISOString().split('T')[0];
                    
                    if (app.created_at) {
                        date = new Date(app.created_at).toISOString().split('T')[0];
                    } else if (app.createdDate) {
                        date = new Date(app.createdDate).toISOString().split('T')[0];
                    }
                    
                    return {
                        id: app.id,
                        student: app.student_name || app.studentName || app.name || 'Unknown',
                        email: app.email,
                        status: 'Pending',
                        date: date
                    };
                });

                res.status(200).json({
                    success: true,
                    message: "Dashboard stats retrieved successfully",
                    stats,
                    recentApplications
                });
            });
        });
    }
}

module.exports = adminController;
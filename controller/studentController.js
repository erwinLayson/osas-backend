const bcrypt = require("bcrypt");
const { getEnv } = require('../config/env');
const { sessionCookieOptions } = require('../config/cookies');
const { sendError } = require('../middleware/errorHandler');
const {approvalMail, rejectionMail} = require("./shared/mailer");

const Students = require('../model/studentModel');
const Applicants = require("../model/applicantsModel");
const Applicant_history = require("../model/applicant_historyModel");
const RecentGrades = require('../model/recent_grades');
const Settings = require('../model/settingsModel');


const studentController = {
    createStudent: (req, res) => {
        try {
            const { studentData, studentAccount } = req.body;

            if (!studentData || !studentAccount) {
                console.error('Missing data:', { studentData, studentAccount });
                return sendError(res, 'Missing student data or account info', 400);
            }

            // Fall back to the shared DEFAULT_PASSWORD from .env when the client
            // does not supply one, so client and server use the same default.
            const student = {
                username: studentAccount.username,
                password: studentAccount.password || getEnv('DEFAULT_PASSWORD'),
                name: studentData.student_name,
                email: studentData.email,
                subjects: typeof studentData.subjects === 'string' ? studentData.subjects : JSON.stringify(studentData.subjects)
            };
            
            console.log('Prepared student data:', JSON.stringify(student, null, 2));
            
            Students.createStudent(student, (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return sendError(res, err, 500);
                }

                approvalMail(
                    "Your application is approve",
                    `please login your account to send requirements`,
                    student,
                )
                const newHistory = {
                    name: student.name,
                    email: student.email,
                    subjects: JSON.stringify(student.subjects),
                    status: "approve"
                }

                Applicant_history.create(newHistory, (err) => {
                    if (err) return sendError(res, err, 500);
                    
                    Applicants.delete(studentData.id, (err) => {
                        if (err) return sendError(res, err, 500);

                        res.status(201).json({ message: "Student Approve Successfull", success: true });
                    })
                })
                
            });
        } catch (error) {
            console.error('Caught exception:', error);
            return res.status(500).json({ message: error.message || "Internal Server Error", success: false });
        }
    },

    rejectStudent: (req, res) => {
        const studentEmail = req.body.email;

        Applicants.getByEmail(studentEmail, (err, result) => {
            if (err) return sendError(res, err, 500);
            
            if (!result || result.length === 0) {
                return sendError(res, 'Student not found', 404);
            }

            const newHistory = {
                name: result[0].student_name,
                email: result[0].email,
                subjects: result[0].subjects,
                status: "reject"
            }

            Applicant_history.create(newHistory, (err) => {
                if (err) return sendError(res, err, 500);
    
                Applicants.delete(result[0].id, (delErr, delResult) => {
                    if (delErr) return sendError(res, delErr, 500);

                    rejectionMail( studentEmail,"Notice of rejection of application", "Scholarship application rejected", "Your average grade not pass the Scholarship requirements");
                    return res.status(200).json({ message: "Student rejected and deleted successfully", success: true });
                });
            })
        })
    },

    getAll: (req, res) => {
        Students.getAllStudent((err, result) => {
            if (err) return sendError(res, err, 500);

            return res.status(201).json(result);
        })
    },

    editStudent: (req, res) => {
        const studentId = req.params.id;
        const studentData = req.body;

        // Validate required fields (password is optional)
        if (!studentData.name || !studentData.email || !studentData.username) {
            return sendError(res, 'Name, email, and username are required', 400);
        }

        // Remove password from update if it's empty
        const updateData = { ...studentData };
        if (!updateData.password || updateData.password.trim() === '') {
            delete updateData.password;
        }

        const hashPassword = bcrypt.hashSync(updateData.password, 10);
        updateData['password'] = hashPassword;

        Students.updateStudent(studentId, updateData, (err, result) => {
            if (err) {
                console.error('Update error:', err);
                return sendError(res, err, 500);
            }
            
            if (result.affectedRows === 0) {
                return sendError(res, 'Student not found', 404);
            }

            if (result.affectedRows === 0) {
                return res.status(201).json({message: "No update change", success: true})
            }

            approvalMail("Notice in request for account update", "Your new account details", studentData);
            return res.status(200).json({ message: "Student updated successfully", success: true });
        })
    },

    deleteStudent: (req, res) => {
        const studentId = req.params.id;

        Students.deleteStudent(studentId, (err, result) => {
            if (err) {
                console.error('Delete error:', err);
                return sendError(res, err, 500);
            }

            if (!result || result.affectedRows === 0) {
                return sendError(res, 'Student not found', 404);
            }

            return res.status(200).json({ message: 'Student deleted successfully', success: true });
        });
    },

    getProfile: (req, res) => {
        const username = req.user.username; // From JWT token

        Students.getStudentByUsername(username, (err, result) => {
            if (err) {
                return sendError(res, err, 500);
            }

            if (result.length === 0) {
                return sendError(res, 'Student not found', 404);
            }

            const student = result[0];
            
            // Remove password from response
            delete student.password;

            // Parse subjects if it's a string
            if (typeof student.subjects === 'string') {
                try {
                    student.subjects = JSON.parse(student.subjects);
                } catch (e) {
                    console.error('Error parsing subjects:', e);
                }
            }

            return res.status(200).json({ 
                message: "Profile retrieved successfully", 
                success: true, 
                data: student 
            });
        });
    },
    updateProfile: (req, res) => {
        const username = req.user.username;
        const updateData = req.body;

        if (!updateData || Object.keys(updateData).length === 0) {
            return sendError(res, 'No data provided', 400);
        }

        // Find student by username to get id
        Students.getStudentByUsername(username, (err, result) => {
            if (err) return sendError(res, err, 500);
            if (!result || result.length === 0) return sendError(res, 'Student not found', 404);

            const student = result[0];
            const studentId = student.id;

            // Prevent accidental password updates here
            if (updateData.password) delete updateData.password;

            // If email changed, ensure uniqueness
            const checks = [];
            if (updateData.email && updateData.email !== student.email) {
                checks.push(cb => Students.getStudentByEmail(updateData.email, (e, r) => cb(e, r)));
            }
            if (updateData.username && updateData.username !== student.username) {
                checks.push(cb => Students.getStudentByUsername(updateData.username, (e, r) => cb(e, r)));
            }

            const runChecks = (i) => {
                if (i >= checks.length) {
                            // perform update
                            const performUpdate = () => {
                                Students.updateStudent(studentId, updateData, (err2, updateRes) => {
                                    if (err2) return sendError(res, err2, 500);

                                    // If username was changed, re-issue student JWT so token matches new username
                                    const newUsername = updateData.username || student.username;
                                    try {
                                        const newToken = require('jsonwebtoken').sign({ username: newUsername, id: studentId, role: 'student' }, getEnv('STUDENT_LOGIN_SECRET_KEY'), { expiresIn: '1h' });
                                        res.cookie('studentLogin', newToken, sessionCookieOptions());
                                        // Re-issued session goes only in the cookie, never the body.
                                        return res.status(200).json({ message: 'Profile updated successfully', success: true });
                                    } catch (e) {
                                        // token issuance failed, still return success
                                        console.warn('Failed to sign new token after profile update', e && e.message);
                                        return res.status(200).json({ message: 'Profile updated successfully', success: true });
                                    }
                                });
                            };

                            // If subjects were provided in the update, enforce one-update-per-semester and save the PREVIOUS subjects snapshot to recent_grades before updating
                            if (updateData.subjects) {
                                try {
                                    const getCurrentSemester = () => {
                                        const now = new Date();
                                        const year = now.getFullYear();
                                        const month = now.getMonth() + 1; // 1-12
                                        const sem = month >= 7 ? 'S2' : 'S1';
                                        return `${year}-${sem}`;
                                    };

                                    const semester = getCurrentSemester();

                                    // Enforce one-update-per-session: check current grade_edit_session and use admin-provided semester if present
                                    Settings.getByKey('grade_edit_session', (setErr, setRes) => {
                                        if (setErr) console.warn('Failed to read grade_edit_session', setErr && setErr.message ? setErr.message : setErr);
                                        const sessionId = setRes && setRes.length > 0 ? (setRes[0].setting_value || '') : '';

                                        // read admin-provided semester override
                                        Settings.getByKey('grade_edit_semester', (sErr, sRes) => {
                                            if (sErr) console.warn('Failed to read grade_edit_semester', sErr && sErr.message ? sErr.message : sErr);
                                            const configuredSemester = sRes && sRes.length > 0 ? (sRes[0].setting_value || '') : '';
                                            const semesterToUse = configuredSemester || semester;

                                            const saveSnapshotAndUpdate = (sid) => {
                                            try {
                                                let previousSubjectsArr = [];
                                                try {
                                                    previousSubjectsArr = typeof student.subjects === 'string' ? JSON.parse(student.subjects) : student.subjects;
                                                } catch (e) {
                                                    previousSubjectsArr = [];
                                                }

                                                    const previousSubjectsStr = typeof student.subjects === 'string' ? student.subjects : JSON.stringify(previousSubjectsArr);
                                                    let previousAverage = null;
                                                    if (Array.isArray(previousSubjectsArr) && previousSubjectsArr.length > 0) {
                                                        const total = previousSubjectsArr.reduce((acc, s) => acc + (Number(s.grade || s.score || 0) || 0), 0);
                                                        previousAverage = Number((total / previousSubjectsArr.length).toFixed(2));
                                                    }

                                                    RecentGrades.addRecentGrade({ studentId, studentName: student.name || student.student_name || null, subjects: previousSubjectsStr, semester: semesterToUse, average: previousAverage, sessionId: sid }, (rgErr) => {
                                                        if (rgErr) console.warn('Failed to save recent grades:', rgErr && rgErr.message ? rgErr.message : rgErr);
                                                        // proceed with update regardless of snapshot result
                                                        performUpdate();
                                                    });
                                            } catch (e) {
                                                console.warn('Failed to prepare recent grades snapshot', e && e.message);
                                                performUpdate();
                                            }
                                            };

                                            if (sessionId) {
                                                RecentGrades.getByStudentAndSession(studentId, sessionId, (checkErr, rows) => {
                                                    if (checkErr) {
                                                        console.warn('Failed to check session updates', checkErr && checkErr.message ? checkErr.message : checkErr);
                                                        // fail-safe: still save snapshot and allow update
                                                        return saveSnapshotAndUpdate(sessionId);
                                                    }

                                                    if (rows && rows.length > 0) {
                                                        return sendError(res, 'You have already updated grades for the current admin-enabled session', 403);
                                                    }

                                                    // not updated in this session yet -> save snapshot with session id and update
                                                    return saveSnapshotAndUpdate(sessionId);
                                                });
                                            } else {
                                                // no session id configured: fallback to saving snapshot without session
                                                return saveSnapshotAndUpdate('');
                                            }
                                        });
                                    });
                                } catch (e) {
                                    console.warn('Failed to prepare recent grades payload', e && e.message);
                                    // still proceed with update
                                    performUpdate();
                                }
                                return;
                            }

                            performUpdate();
                    return;
                }

                checks[i]((errc, rc) => {
                    if (errc) return sendError(res, errc, 500);
                    // rc may contain rows; ignore the row that belongs to the current student
                    if (rc && rc.length > 0) {
                        const other = rc.find(r => r.id !== studentId);
                        if (other) return sendError(res, 'Email or username already in use', 409, { isDuplicate: true });
                        // otherwise the only match is the current student -> allow
                    }
                    runChecks(i+1);
                });
            };

            runChecks(0);
        });
    },

    changePassword: (req, res) => {
        const username = req.user.username;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return sendError(res, 'All password fields are required', 400);
        }

        if (newPassword !== confirmPassword) {
            return sendError(res, 'New password and confirm password do not match', 400);
        }

        Students.getStudentByUsername(username, (err, result) => {
            if (err) return sendError(res, err, 500);
            if (!result || result.length === 0) return sendError(res, 'Student not found', 404);

            const student = result[0];
            const verify = require('bcrypt').compareSync(currentPassword, student.password);
            if (!verify) return sendError(res, 'Current password is incorrect', 401);

            const hash = require('bcrypt').hashSync(newPassword, 10);
            Students.updateStudent(student.id, { password: hash }, (err2, updateRes) => {
                if (err2) return sendError(res, err2, 500);
                return res.status(200).json({ message: 'Password changed successfully', success: true });
            });
        });
    },
    
}

module.exports = studentController;
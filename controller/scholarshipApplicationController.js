const path = require('path');
const fs = require('fs');
const ScholarshipApplication = require('../model/scholarshipApplicationModel');
const { authenticateStudent } = require('../authenticate/auth');
const { sendScholarshipMail, rejectionMail, sendScholarshipApprovalMail } = require('./shared/mailer');
const applicantsModel = require('../model/applicantsModel');
const studentModel = require('../model/studentModel');
const { sendError } = require('../middleware/errorHandler');

class ScholarshipApplicationController {
  // Handles file uploads and creates an application record
  static apply(req, res) {
    // req.user should be present from authenticateStudent middleware
    const student = req.user;
    console.log('ScholarshipApplicationController.apply: req.user=', student);
    const scholarship_id = req.params.id;

    if (!student || !student.id) return sendError(res, 'Authentication required', 401);

    // Before saving files, ensure the student hasn't already applied to this scholarship
    ScholarshipApplication.getByStudentAndScholarship(student.id, scholarship_id, (checkErr, existingRows) => {
      if (checkErr) {
        console.error('Error checking existing application:', checkErr);
        return sendError(res, checkErr, 500);
      }

      if (existingRows && existingRows.length > 0) {
        return sendError(res, 'You have already applied for this scholarship', 409, { isDuplicate: true });
      }

      // files handled by multer are available as req.files
      const files = req.files ?? [];
      const savedFiles = [];

      try {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'scholarship_applications');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        files.forEach(file => {
          // move file from multer temp to uploads with original filename prefix
          const timestamp = Date.now();
          const safeName = `${student.id}_${timestamp}_${file.originalname}`.replace(/\s+/g, '_');
          const dest = path.join(uploadDir, safeName);
          fs.renameSync(file.path, dest);
          // store relative path
          savedFiles.push(path.join('uploads', 'scholarship_applications', safeName));
        });

        const payload = {
          student_id: student.id,
          scholarship_id: scholarship_id,
          documents: savedFiles
        };

        ScholarshipApplication.create(payload, (err, result) => {
          if (err) {
            console.error('Error saving scholarship application:', err);
            return sendError(res, err, 500);
          }

          return res.status(201).json({ message: 'Application submitted', success: true, applicationId: result.insertId });
        });
      } catch (e) {
        console.error('Apply error', e);
        return sendError(res, e, 500);
      }
    });
  }

  static listAll(req, res) {
    ScholarshipApplication.getAll((err, rows) => {
      if (err) {
        console.error('Error fetching applications:', err);
        return sendError(res, err, 500);
      }
      return res.status(200).json({ message: 'Applications retrieved', success: true, data: rows });
    });
  }

  static listByStudent(req, res) {
    const student = req.user;
    if (!student || !student.id) return sendError(res, 'Authentication required', 401);

    ScholarshipApplication.getByStudent(student.id, (err, rows) => {
      if (err) {
        console.error('Error fetching student applications:', err);
        return sendError(res, err, 500);
      }

      // parse documents JSON safely
      const parsed = (rows || []).map(r => {
        let docs = r.documents || r.documents;
        try { if (typeof docs === 'string') docs = JSON.parse(docs); } catch (e) { docs = docs || []; }
        return { ...r, documents: docs };
      });

      return res.status(200).json({ message: 'Student applications retrieved', success: true, data: parsed });
    });
  }

  static getById(req, res) {
    const id = req.params.id;
    ScholarshipApplication.getById(id, (err, rows) => {
      if (err) return sendError(res, err, 500);
      if (!rows || rows.length === 0) return sendError(res, 'Application not found', 404);
      return res.status(200).json({ message: 'Application retrieved', success: true, data: rows[0] });
    });
  }

  static updateStatus(req, res) {
    const id = req.params.id;
    const { status } = req.body;
    if (!status) return sendError(res, 'Status required', 400);

    if (status !== 'Approved' && status !== 'Rejected') {
      return sendError(res, 'Status must be Approved or Rejected', 400);
    }

    ScholarshipApplication.getById(id, (err, rows) => {
      if (err) return sendError(res, err, 500);
      if (!rows || rows.length === 0) return sendError(res, 'Application not found', 404);
      const app = rows[0];

      // Fetch student name (used for both approval and rejection emails)
      let studentName = 'Student';
      try {
        studentModel.getById(app.student_id, (fetchErr, studentRows) => {
          if (!fetchErr && studentRows && studentRows.length > 0) {
            studentName = studentRows[0].name || studentRows[0].studentName || 'Student';
          }
        });
      } catch (fetchErr) {
        console.warn('Could not fetch student name for email:', fetchErr.message);
      }

      const scholarshipName = app.scholarship_name || 'the scholarship';
      const to = app.email || app.email;

      // Move application to history and delete from active table
      ScholarshipApplication.moveToHistory(id, status, (moveErr) => {
        if (moveErr) return sendError(res, moveErr, 500);

        if (status === 'Approved') {
          const { reduceAvailableSlots } = require('../model/scholarshipSlotUtils');
          reduceAvailableSlots(app.scholarship_id, 1, (slotErr) => {
            if (slotErr) {
              console.error('Failed to reduce scholarship slots:', slotErr);
            }
            try {
              sendScholarshipApprovalMail(to, {
                studentName,
                email: to,
                scholarshipName,
                amount: app.amount || null
              });
            } catch (e) {
              console.warn('Failed to send approval email', e && e.message);
            }
            return res.status(200).json({ message: 'Application approved and moved to history', success: true });
          });
        } else {
          try {
            rejectionMail(
              to,
              'Scholarship Application Update — ' + scholarshipName,
              'We regret to inform you that your application was not approved.',
              scholarshipName,
              { studentName, email: to, scholarshipName }
            );
          } catch (e) {
            console.warn('Failed to send rejection email', e && e.message);
          }
          return res.status(200).json({ message: 'Application rejected and moved to history', success: true });
        }
      });
    });
  }

  static downloadDocument(req, res) {
    const id = req.params.id;
    const index = parseInt(req.params.index || '0', 10);

    ScholarshipApplication.getById(id, (err, rows) => {
      if (err) return sendError(res, err, 500);
      if (!rows || rows.length === 0) return sendError(res, 'Application not found', 404);

      const app = rows[0];
      let docs = app.documents || app.documents;
      try {
        if (typeof docs === 'string') docs = JSON.parse(docs);
      } catch (e) {
        docs = docs || [];
      }

      if (!Array.isArray(docs) || docs.length === 0 || index < 0 || index >= docs.length) {
        return sendError(res, 'Document not found', 404);
      }

      const docPath = docs[index];
      const fullPath = path.join(__dirname, '..', docPath);

      if (!fs.existsSync(fullPath)) return sendError(res, 'File not found on server', 404);

      return res.sendFile(fullPath);
    });
  }

  static listHistory(req, res) {
    ScholarshipApplication.getHistory((err, rows) => {
      if (err) {
        console.error('Error fetching application history:', err);
        return sendError(res, err, 500);
      }
      return res.status(200).json({ message: 'Application history retrieved', success: true, data: rows });
    });
  }

  static listHistoryByStudent(req, res) {
    const student = req.user;
    if (!student || !student.id) return sendError(res, 'Authentication required', 401);

    ScholarshipApplication.getHistoryByStudent(student.id, (err, rows) => {
      if (err) {
        console.error('Error fetching student application history:', err);
        return sendError(res, err, 500);
      }

      // parse documents JSON safely
      const parsed = (rows || []).map(r => {
        let docs = r.documents;
        try { if (typeof docs === 'string') docs = JSON.parse(docs); } catch (e) { docs = docs || []; }
        return { ...r, documents: docs };
      });

      return res.status(200).json({ message: 'Student application history retrieved', success: true, data: parsed });
    });
  }
}

module.exports = ScholarshipApplicationController;

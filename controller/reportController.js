const db = require('../config/database');
const Reports = require('../model/reportModel');
const fs = require('fs');
const path = require('path');
const { sendError } = require('../middleware/errorHandler');

function formatCSV(rows, headers) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  const lines = [];
  lines.push(headers.join(','));
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

class ReportController {
  static async generateReport(req, res) {
    try {
      const { reportType, dateFrom, dateTo, status } = req.body;
      const params = [];
      let sql = '';

      const hasDateRange = dateFrom && dateTo;

      if (reportType === 'students') {
        sql = 'SELECT * FROM students';
        if (hasDateRange) sql += ' WHERE DATE(created_at) BETWEEN ? AND ?', params.push(dateFrom, dateTo);
      } else if (reportType === 'scholarships') {
        sql = 'SELECT * FROM scholarships';
        if (hasDateRange) sql += ' WHERE DATE(created_at) BETWEEN ? AND ?', params.push(dateFrom, dateTo);
        if (status && String(status).toLowerCase() !== 'all') {
          sql += hasDateRange ? ' AND status = ?' : ' WHERE status = ?';
          params.push(status);
        }
      } else if (reportType === 'applications') {
        sql = 'SELECT * FROM applicants';
        if (hasDateRange) sql += ' WHERE DATE(created_at) BETWEEN ? AND ?', params.push(dateFrom, dateTo);
      } else {
        return sendError(res, 'Invalid report type', 400);
      }        db.query(sql, params, (err, results) => {
        if (err) return sendError(res, err, 500);

        let headers = [];
        let rows = [];

        if (!results || results.length === 0) {
          headers = ['no_data'];
          rows = [];
        } else if (reportType === 'students') {
          // Remove password, updated_at, subjects; add average; format created_at
          const parseSubjects = (field) => {
            if (!field) return [];
            try { return typeof field === 'string' ? JSON.parse(field) : field; } catch(e){ return []; }
          };
          headers = Object.keys(results[0])
            .filter(h => h !== 'password' && h !== 'subjects' && h !== 'updated_at')
            .map(h => h === 'created_at' ? 'created_at' : h);
          if (!headers.includes('average')) headers.push('average');

          rows = results.map(r => {
            const obj = {};
            for (const k of Object.keys(r)) {
              if (k === 'password' || k === 'subjects' || k === 'updated_at') continue;
              let v = r[k];
              if (k === 'created_at') {
                try {
                  v = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(v));
                } catch { v = r[k]; }
              }
              obj[k] = v;
            }
            // Compute average from subjects
            const subs = parseSubjects(r.subjects);
            const grades = Array.isArray(subs) ? subs.map(s => parseFloat(s.grade ?? s.score ?? s.value ?? NaN)).filter(n => !isNaN(n)) : [];
            obj['average'] = grades.length ? (grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(2) : '';
            return obj;
          });
        } else {
          // generic: remove updated_at, password, and format created_at if present
          headers = Object.keys(results[0]).filter(h => h !== 'updated_at' && h !== 'password');
          rows = results.map(r => {
            const obj = {};
            for (const k of Object.keys(r)) {
              if (k === 'updated_at' || k === 'password') continue;
              let v = r[k];
              if (k === 'created_at') {
                try {
                  v = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(v));
                } catch { v = r[k]; }
              }
              obj[k] = v;
            }
            return obj;
          });
        }

        const csv = formatCSV(rows, headers);
        const filename = `report-${reportType}-${Date.now()}.csv`;

        // write CSV file to disk and record report metadata
        try {
          const dir = path.join(__dirname, '..', 'generated_reports');
          fs.mkdirSync(dir, { recursive: true });
          const filepath = path.join(dir, filename);
          fs.writeFile(filepath, csv, 'utf8', (writeErr) => {
            const size_bytes = Buffer.byteLength(csv, 'utf8');
            const generated_by = req.user ? (req.user.username || req.user) : 'admin';

            if (writeErr) console.warn('Failed to write report file', writeErr);

            Reports.create({ name: filename, type: reportType, generated_by, filename, size_bytes, status: 'Ready' }, (err) => {
              if (err) console.warn('Failed to record report metadata', err);
              // send CSV back to client
              res.setHeader('Content-Type', 'text/csv');
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              res.send(csv);
            });
          });
        } catch (e) {
          console.warn('Error recording report', e);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(csv);
        }
      });
    } catch (error) {
      console.error(error);
      return sendError(res, error, 500);
    }
  }

  static async downloadReport(req, res) {
    const id = req.params.id;
    Reports.getById(id, (err, results) => {
      if (err) return sendError(res, err, 500);
      if (!results || !results[0]) return sendError(res, 'Report not found', 404);
      const report = results[0];
      const filepath = path.join(__dirname, '..', 'generated_reports', report.filename);
      fs.access(filepath, fs.constants.R_OK, (accessErr) => {
        if (accessErr) return sendError(res, 'Report file not found', 404);
        res.download(filepath, report.filename);
      });
    });
  }

  static async deleteReport(req, res) {
    const id = req.params.id;
    Reports.getById(id, (err, results) => {
      if (err) return sendError(res, err, 500);
      if (!results || !results[0]) return sendError(res, 'Report not found', 404);
      const report = results[0];
      const filepath = path.join(__dirname, '..', 'generated_reports', report.filename);
      fs.unlink(filepath, (unlinkErr) => {
        // ignore file unlink errors and proceed to delete DB row
        Reports.deleteById(id, (delErr, delRes) => {
          if (delErr) return sendError(res, delErr, 500);
          return res.status(200).json({ message: 'Report deleted', success: true });
        });
      });
    });
  }

  static async getSummary(req, res) {
    Reports.getSummary((err, data) => {
      if (err) return sendError(res, err, 500);

      const response = {
        totalReportsGenerated: data.total_this_month || 0,
        storageUsedBytes: data.storage_bytes || 0,
        lastGenerated: data.lastGenerated || null,
        mostGenerated: data.mostGenerated || null
      };

      res.status(200).json({ message: 'Summary retrieved', success: true, data: response });
    });
  }

  static async getRecent(req, res) {
    const limit = parseInt(req.query.limit || '10', 10);
    Reports.getRecent(limit, (err, results) => {
      if (err) return sendError(res, err, 500);
      res.status(200).json({ message: 'Recent reports', success: true, data: results });
    });
  }
}

module.exports = ReportController;

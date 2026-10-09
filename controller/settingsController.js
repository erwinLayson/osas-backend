const Settings = require('../model/settingsModel');
const { sendError } = require('../middleware/errorHandler');

const settingsController = {
  // Maintenance Mode
  getMaintenanceMode: (req, res) => {
    Settings.getByKey('maintenance_mode', (err, result) => {
      if (err) return sendError(res, err, 500);
      const row = (result && result.length > 0) ? result[0] : null;
      const val = row ? (String(row.setting_value) === 'true') : false;
      return res.status(200).json({ message: 'ok', success: true, value: val });
    });
  },

  setMaintenanceMode: (req, res) => {
    const { value } = req.body;
    if (typeof value === 'undefined') return sendError(res, 'Missing value', 400);
    const v = value ? 'true' : 'false';

    Settings.upsert('maintenance_mode', v, (err) => {
      if (err) return sendError(res, err, 500);
      return res.status(200).json({ message: 'Maintenance mode updated', success: true, value: v === 'true' });
    });
  },

  // Check maintenance mode (for login endpoints)
  checkMaintenanceMode: (callback) => {
    Settings.getByKey('maintenance_mode', (err, result) => {
      if (err) return callback(err, false);
      const row = (result && result.length > 0) ? result[0] : null;
      const val = row ? (String(row.setting_value) === 'true') : false;
      return callback(null, val);
    });
  },

  getAllowGradeEdit: (req, res) => {
    // return allow flag as well as current session id and semester so clients can detect prior updates
    Settings.getByKey('allow_grade_edit', (err, result) => {
      if (err) return sendError(res, err, 500);
      const row = (result && result.length > 0) ? result[0] : null;
      const val = row ? (String(row.setting_value) === 'true') : false;

      Settings.getByKey('grade_edit_session', (err2, res2) => {
        if (err2) console.warn('Failed to read grade_edit_session', err2 && err2.message ? err2.message : err2);
        const sessionRow = (res2 && res2.length > 0) ? res2[0] : null;
        const sessionId = sessionRow ? (sessionRow.setting_value || '') : '';

        Settings.getByKey('grade_edit_semester', (err3, res3) => {
          if (err3) console.warn('Failed to read grade_edit_semester', err3 && err3.message ? err3.message : err3);
          const semRow = (res3 && res3.length > 0) ? res3[0] : null;
          const semester = semRow ? (semRow.setting_value || '') : '';

          return res.status(200).json({ message: 'ok', success: true, value: val, sessionId, semester });
        });
      });
    });
  },

  setAllowGradeEdit: (req, res) => {
    const { value, semester } = req.body;
    if (typeof value === 'undefined') return sendError(res, 'Missing value', 400);
    const v = value ? 'true' : 'false';

    // when enabling, require semester info
    if (value) {
      if (!semester || typeof semester !== 'string' || !semester.match(/^[0-9]{4}-S[12]$/)) {
        return sendError(res, 'Missing or invalid semester. Use format YYYY-S1 or YYYY-S2', 400);
      }
    }

    // when enabling, create a new session id so students can update once per enable
    const sessionId = value ? String(Date.now()) : '';

    Settings.upsert('allow_grade_edit', v, (err) => {
      if (err) return sendError(res, err, 500);

      // store/clear session id and semester
      Settings.upsert('grade_edit_session', sessionId, (err2) => {
        if (err2) console.warn('Failed to save grade_edit_session', err2 && err2.message ? err2.message : err2);
        const semValue = value ? semester : '';
        Settings.upsert('grade_edit_semester', semValue, (err3) => {
          if (err3) console.warn('Failed to save grade_edit_semester', err3 && err3.message ? err3.message : err3);
          return res.status(200).json({ message: 'Setting updated', success: true, value: v === 'true' });
        });
      });
    });
  }
};

module.exports = settingsController;
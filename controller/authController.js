const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { getEnv } = require('../config/env');
const { sendError } = require('../middleware/errorHandler');
const { identifyCurrentUser, ROLES } = require('../authenticate/users');
const adminModel = require('../model/adminModel');
const studentModel = require('../model/studentModel');
const settingsController = require('./settingsController');

const COOKIE_OPTIONS = { sameSite: 'lax', httpOnly: true, secure: false };

/**
 * Unified authentication controller.
 *
 * One login endpoint serves both roles. The role may be supplied explicitly,
 * otherwise both roles are tried and the matching one wins.
 */

// ---------------------------------------------------------------------------
// Credential verification (callback style, matching the models)
// ---------------------------------------------------------------------------

function verifyAdmin(username, password, cb) {
  adminModel.getByUsername(username, (err, rows) => {
    if (err) return cb({ status: 500, message: 'Internal server error', code: 'DB_ERROR' });
    if (!rows || rows.length === 0) {
      return cb({ status: 401, message: 'Invalid Username', code: 'USER_NOT_FOUND' });
    }

    const admin = rows[0];
    if (!admin.password) {
      return cb({ status: 500, message: 'Account password not configured', code: 'NO_PASSWORD' });
    }

    let ok = false;
    try {
      ok = bcrypt.compareSync(password, admin.password);
    } catch (e) {
      return cb({ status: 500, message: 'Password verification failed', code: 'VERIFY_FAILED' });
    }
    if (!ok) return cb({ status: 401, message: 'Incorrect Password', code: 'BAD_PASSWORD' });

    cb(null, {
      role: 'admin',
      username: admin.username,
      id: admin.id,
      name: admin.username,
      email: admin.email,
    });
  });
}

function verifyStudent(username, password, cb) {
  studentModel.getStudentByUsername(username, (err, rows) => {
    if (err) return cb({ status: 500, message: 'Database Error', code: 'DB_ERROR' });
    if (!rows || rows.length === 0) {
      return cb({ status: 401, message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const student = rows[0];

    let ok = false;
    try {
      ok = bcrypt.compareSync(password, student.password);
    } catch (e) {
      return cb({ status: 500, message: 'Password verification failed', code: 'VERIFY_FAILED' });
    }
    if (!ok) return cb({ status: 401, message: 'Incorrect password', code: 'BAD_PASSWORD' });

    cb(null, {
      role: 'student',
      username: student.username,
      id: student.id,
      name: student.name || student.student_name,
      email: student.email,
    });
  });
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function issueSession(res, user) {
  const cfg = ROLES[user.role];
  if (!cfg) throw new Error(`Unknown role: ${user.role}`);

  const payload = { username: user.username, id: user.id, role: user.role };
  const token = jwt.sign(payload, getEnv(cfg.secretKey), { expiresIn: '1h' });

  res.cookie(cfg.cookie, token, COOKIE_OPTIONS);

  // Drop any session belonging to the other role. Without this, a stale cookie
  // from a previous login on the same browser can win identifyCurrentUser()
  // (it checks roles in order) and hand the user the wrong account type.
  for (const [role, roleCfg] of Object.entries(ROLES)) {
    if (role !== user.role) res.clearCookie(roleCfg.cookie, COOKIE_OPTIONS);
  }

  return token;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

const authController = {
  /**
   * POST /auth/login
   * body: { username, password, role? }
   * role is optional; when omitted, admin is tried first, then student.
   */
  login(req, res) {
    const { username, password } = req.body || {};
    const role = req.body && req.body.role ? String(req.body.role).toLowerCase() : null;

    if (!username || !password) {
      return sendError(res, 'Please fill up all fields', 400);
    }
    if (role && !ROLES[role]) {
      return sendError(res, `Unknown role: ${role}`, 400);
    }

    const finish = (err, user) => {
      if (err) return sendError(res, err.message || 'Login failed', err.status || 500);

      const token = issueSession(res, user);
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        role: user.role,
        user: { username: user.username, id: user.id, role: user.role, name: user.name },
        token,
      });
    };

    // Maintenance mode blocks students (admins may still sign in).
    const blockIfMaintenance = (next) => {
      settingsController.checkMaintenanceMode((err, isMaintenance) => {
        if (err) console.warn('Maintenance check failed:', err.message || err);
        if (isMaintenance) {
          return sendError(res, 'System is under maintenance. Please try again later.', 503);
        }
        next();
      });
    };

    if (role === 'admin') {
      return verifyAdmin(username, password, finish);
    }
    if (role === 'student') {
      return blockIfMaintenance(() => verifyStudent(username, password, finish));
    }
    // No role given: try admin first (admins bypass maintenance), then student.
    verifyAdmin(username, password, (adminErr, adminUser) => {
      if (!adminErr) return finish(null, adminUser);

      // Only continue when the username simply isn't an admin. A wrong admin
      // password must report "Incorrect Password" instead of falling through
      // to the student table (which would answer "User not found").
      if (adminErr.code !== 'USER_NOT_FOUND') {
        return sendError(res, adminErr.message || 'Login failed', adminErr.status || 500);
      }

      blockIfMaintenance(() => {
        verifyStudent(username, password, (studentErr, studentUser) => {
          if (!studentErr) return finish(null, studentUser);

          // Neither table knows this username: keep the message generic so the
          // response never reveals which account type was probed.
          if (studentErr.code === 'USER_NOT_FOUND') {
            return sendError(res, 'Invalid username or password', 401);
          }
          return sendError(res, studentErr.message || 'Login failed', studentErr.status || 500);
        });
      });
    });
  },

  /**
   * GET /auth/me — identify the current user and their role.
   * This is the server-side "who am I" used by the client route guards.
   */
  me(req, res) {
    const user = identifyCurrentUser(req);
    if (!user) {
      return res.status(401).json({ success: false, authenticated: false, message: 'Not authenticated' });
    }
    return res.status(200).json({
      success: true,
      authenticated: true,
      user: { username: user.username, id: user.id, role: user.role },
    });
  },

  /**
   * POST /auth/logout — clear both session cookies.
   */
  logout(req, res) {
    res.clearCookie(ROLES.admin.cookie, COOKIE_OPTIONS);
    res.clearCookie(ROLES.student.cookie, COOKIE_OPTIONS);
    return res.status(200).json({ success: true, message: 'Logout successful' });
  },
};

module.exports = authController;

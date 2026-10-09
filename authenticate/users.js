const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');
const { UnauthorizedError, ForbiddenError } = require('../middleware/errors');

/**
 * Global user identity module.
 *
 * The system has two account types (admin, student). Each signs its JWT with a
 * different secret and stores it in a different cookie. This module is the one
 * place that answers "who is the current user and what is their role?" regardless
 * of which cookie/token was presented.
 */

// Role -> where its token lives and how to verify it.
const ROLES = {
  admin: { cookie: 'adminLogin', secretKey: 'ADMIN_LOGIN_SECRET_KEY' },
  student: { cookie: 'studentLogin', secretKey: 'STUDENT_LOGIN_SECRET_KEY' },
};

const ALL_ROLES = Object.keys(ROLES); // ['admin', 'student']

function getBearerToken(req) {
  const header = req.headers && req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Identify the current user from the request's cookies or Authorization header.
 * Tries each known role's secret until one verifies.
 *
 * @returns {{ role: string, username?: string, id?: number, raw: object } | null}
 */
function identifyCurrentUser(req) {
  const bearer = getBearerToken(req);

  for (const role of ALL_ROLES) {
    const { cookie, secretKey } = ROLES[role];

    // Prefer the role's cookie, fall back to a Bearer token.
    const candidates = [];
    if (req.cookies && req.cookies[cookie]) candidates.push(req.cookies[cookie]);
    if (bearer) candidates.push(bearer);

    for (const token of candidates) {
      try {
        const payload = jwt.verify(token, getEnv(secretKey));
        return {
          role,
          username: payload.username,
          id: payload.id,
          raw: payload,
        };
      } catch (err) {
        // Wrong secret or expired token — try the next candidate.
      }
    }
  }

  return null;
}

/**
 * Middleware: attach `req.currentUser` (and `req.user`) if a valid session exists.
 * Does NOT reject unauthenticated requests.
 */
function attachCurrentUser(req, res, next) {
  const user = identifyCurrentUser(req);
  if (user) {
    req.currentUser = user;
    req.user = user;
  }
  next();
}

/**
 * Middleware: reject if not authenticated.
 */
function requireAuth(req, res, next) {
  const user = req.currentUser || identifyCurrentUser(req);
  if (!user) return next(new UnauthorizedError('Authentication required'));
  req.currentUser = user;
  req.user = user;
  next();
}

/**
 * Middleware factory: reject if the current user's role is not allowed.
 * Usage: router.get('/x', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...allowed) {
  if (allowed.length === 0) {
    throw new Error('requireRole must be called with at least one role');
  }
  return (req, res, next) => {
    const user = req.currentUser || req.user || identifyCurrentUser(req);
    if (!user) return next(new UnauthorizedError('Authentication required'));

    const role = user.role || 'user';
    if (!allowed.includes(role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    req.currentUser = user;
    req.user = user;
    next();
  };
}

module.exports = {
  ROLES,
  ALL_ROLES,
  identifyCurrentUser,
  attachCurrentUser,
  requireAuth,
  requireRole,
};

const { ForbiddenError, UnauthorizedError } = require('../middleware/errors');
const {
    ROLES,
    identifyCurrentUser,
    attachCurrentUser,
    requireAuth,
    requireRole,
} = require('./users');

/**
 * Role authentication middleware.
 *
 * Everything routes through the global users module (authenticate/users.js),
 * which identifies "who is the current user and what is their role?" from
 * whichever session cookie or Bearer token was presented.
 *
 *  - no valid session at all        -> 401 Unauthorized
 *  - valid session but wrong role   -> 403 Forbidden
 *  - success                        -> req.user / req.currentUser = { username, id, role, ... }
 */
function requireAuthenticatedRole(expectedRole) {
    return (req, res, next) => {
        const user = identifyCurrentUser(req);

        if (!user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        if (user.role !== expectedRole) {
            return next(new ForbiddenError(`Requires ${expectedRole} access`));
        }

        req.user = { role: user.role, ...user.raw };
        req.currentUser = req.user;
        next();
    };
}

/**
 * Authenticate an admin. Rejects students and unauthenticated requests.
 */
const authenticateAdmin = requireAuthenticatedRole('admin');

/**
 * Authenticate a student. Rejects admins and unauthenticated requests.
 */
const authenticateStudent = requireAuthenticatedRole('student');

module.exports = {
    authenticateAdmin,
    authenticateStudent,
    // Re-exported from the global users module — single implementation.
    identifyCurrentUser,
    attachCurrentUser,
    requireAuth,
    requireRole,
    ROLES,
};

/**
 * Typed API errors used with the centralized error middleware.
 *
 * Usage:
 *   const { NotFoundError, UnauthorizedError, ConflictError, BadRequestError, DuplicateError } = require('../middleware/errors');
 *
 *   if (!student) return next(new NotFoundError('Student not found'));
 *   if (!token)    return next(new UnauthorizedError('Authentication required'));
 *   if (exists)    return next(new DuplicateError('Email already exists'));
 *
 * All errors carry a `status` so the error middleware can pick the right HTTP code,
 * and an optional `isDuplicate` flag for 409 responses.
 */

class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {object} [opts]
   * @param {boolean} [opts.isDuplicate]
   */
  constructor(message, status = 500, opts = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.isDuplicate = opts.isDuplicate || false;
    // Preserve a clean stack trace without the Error constructor frame.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

class DuplicateError extends ApiError {
  /**
   * @param {string} message
   * @param {object} [opts]
   */
  constructor(message = 'Duplicate entry', opts = {}) {
    super(message, 409, { ...opts, isDuplicate: true });
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  DuplicateError,
};

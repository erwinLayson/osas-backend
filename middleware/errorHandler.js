/**
 * Centralized error-handling middleware for Express.
 *
 * Usage:
 *   const { sendError } = require('../middleware/errorHandler');
 *
 *   // In a route/controller:
 *   if (err) return sendError(res, err, 500);
 *
 *   // Or throw a typed error and let the error middleware catch it via next(err):
 *   throw new errors.NotFoundError('Student not found');
 *
 * The middleware provides a consistent { success, message, error? } envelope.
 */

const errors = require('./errors');

/**
 * Send a normalized error response immediately.
 *
 * @param {import('express').Response} res
 * @param {Error|string} err
 * @param {number} [status=500]
 * @param {object} [opts]
 * @param {boolean} [opts.isDuplicate=false]  – force a 409 duplicate response
 * @returns {import('express').Response}
 */
function sendError(res, err, status = 500, opts = {}) {
  // Map common error shapes to the right HTTP status.
  // Callers can still override by passing an explicit `status`.
  let statusCode = status;
  let message;
  let isDuplicate = opts.isDuplicate || false;

  if (err instanceof errors.ApiError) {
    statusCode = err.status;
    message = err.message;
    isDuplicate = err.isDuplicate || isDuplicate;
  } else if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object') {
    message = err.message || err.sqlMessage || String(err);
  } else {
    message = 'Internal server error';
  }

  // Duplicate-detection heuristic for constraint violations (e.g. duplicate key).
  if (!isDuplicate && statusCode === 500 && message) {
    const msg = message.toLowerCase();
    if (
      msg.includes('duplicate') ||
      msg.includes('unique') ||
      msg.includes('already exists') ||
      /er_dupe_entry|er_dup_entry|23505|23503/i.test(message)
    ) {
      statusCode = 409;
      isDuplicate = true;
    }
  }

  const body = {
    success: false,
    message: message || httpStatusMessage(statusCode),
  };

  // Include error detail only for internal errors during development.
  // In production you'd want to redact this; keep it here for now since the
  // existing code already leaks err objects in many places.
  if (statusCode === 500 && err && typeof err === 'object') {
    body.error = err.stack || err.message || err;
  } else if (opts.includeError !== false && err && typeof err === 'object') {
    body.error = err;
  }

  return res.status(statusCode).json(body);
}

/**
 * Express error-handling middleware (4 args). Install with:
 *   app.use(errorHandler);
 *
 * It converts thrown/next()'d errors into the standard envelope.
 */
function errorHandler(err, req, res, next) {
  if (!err) return next();

  const status = err.status || 500;
  const isDuplicate = err.isDuplicate || false;

  // If headers already sent, delegate to Express default handler.
  if (res.headersSent) {
    return next(err);
  }

  sendError(res, err, status, { isDuplicate, includeError: status === 500 });
}

/**
 * Map an HTTP status code to a short default message.
 */
function httpStatusMessage(status) {
  return (
    {
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not found',
      409: 'Conflict',
      500: 'Internal server error',
    }[status] || 'Error'
  );
}

module.exports = {
  sendError,
  errorHandler,
  errors,
};

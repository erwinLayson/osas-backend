/**
 * Centralized environment variable accessor.
 * Ensures dotenv is loaded once and provides a single point to read env vars.
 * Defaults to undefined if the variable is not set.
 *
 * On Render (and other PaaS), NODE_ENV can be unset in the shell even though
 * the service is running in production. This helper treats the environment as
 * production when either:
 *   - process.env.NODE_ENV === 'production', or
 *   - the RENDER env var is present (Render web services set this).
 *
 * Production detection is used by the database connector to enforce TLS.
 */
let dotenvLoaded = false;

function ensureDotenv() {
  if (!dotenvLoaded) {
    const path = require('path');
    require('dotenv').config({
      path: path.resolve(__dirname, '..', '.env'),
    });
    dotenvLoaded = true;
  }
}

function isProduction() {
  ensureDotenv();
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.RENDER === ''
  );
}

function getEnv(name) {
  ensureDotenv();
  return process.env[name];
}

module.exports = { getEnv, isProduction };
/**
 * Centralized environment variable accessor.
 * Ensures dotenv is loaded once and provides a single point to read env vars.
 * Defaults to undefined if the variable is not set.
 */
let dotenvLoaded = false;

function ensureDotenv() {
  if (!dotenvLoaded) {
    require('dotenv').config();
    dotenvLoaded = true;
  }
}

function getEnv(name) {
  ensureDotenv();
  return process.env[name];
}

module.exports = { getEnv };

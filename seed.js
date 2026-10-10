#!/usr/bin/env node
/**
 * Seeds a single admin account. Safe to run repeatedly (idempotent).
 *
 * Usage:
 *   node seed.js        -> npm run seed
 *
 * Credentials (override via .env):
 *   ADMIN_USERNAME   default: admin
 *   ADMIN_EMAIL      default: admin@osas.com
 *   ADMIN_PASSWORD   default: DEFAULT_PASSWORD from .env, else admin123
 *
 * The password is hashed with bcrypt before insert — it is never printed.
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { getEnv } = require('./config/env');

const ADMIN_USERNAME = getEnv('ADMIN_USERNAME') || 'admin';
const ADMIN_EMAIL = getEnv('ADMIN_EMAIL') || 'admin@osas.com';
const ADMIN_PASSWORD =
  getEnv('ADMIN_PASSWORD') || getEnv('DEFAULT_PASSWORD') || 'admin123';
const ADMIN_ROLE = getEnv('ADMIN_ROLE') || 'admin';

// Built by the shared helper so seeding uses the same TLS settings as the
// pool and the migration runner (required by TiDB Cloud et al. in production).
const { buildDbConfig } = require('./config/dbConfig');
const dbConfig = buildDbConfig();

async function seed() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [existing] = await conn.query(
      'SELECT id, username, email, role FROM admins WHERE username = ? OR email = ? LIMIT 1',
      [ADMIN_USERNAME, ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      const a = existing[0];
      console.log(
        `Admin already exists — skipping. (id=${a.id}, username="${a.username}", email="${a.email}", role="${a.role}")`
      );
      return { created: false, admin: a };
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const [res] = await conn.query(
      'INSERT INTO admins (username, email, password, role) VALUES (?, ?, ?, ?)',
      [ADMIN_USERNAME, ADMIN_EMAIL, hash, ADMIN_ROLE]
    );

    console.log('Seeded admin account:');
    console.log(`  id:       ${res.insertId}`);
    console.log(`  username: ${ADMIN_USERNAME}`);
    console.log(`  email:    ${ADMIN_EMAIL}`);
    console.log(`  role:     ${ADMIN_ROLE}`);
    console.log(`  password: (hashed with bcrypt — source: ${
      getEnv('ADMIN_PASSWORD') ? 'ADMIN_PASSWORD' : getEnv('DEFAULT_PASSWORD') ? 'DEFAULT_PASSWORD' : 'built-in fallback'
    })`);

    return { created: true };
  } finally {
    await conn.end();
  }
}

// ---------------------------------------------------------------------------
// Module export + CLI guard
// ---------------------------------------------------------------------------

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err.message || err);
      process.exit(1);
    });
}

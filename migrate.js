#!/usr/bin/env node
/**
 * Database migration runner for the OSAS server.
 *
 * Usage:
 *   node migrate.js                       – run pending migrations against the default DB
 *   node migrate.js --dir <path>         – use a custom migrations directory
 *   node migrate.js --env production     – load .env.production instead of .env
 *   node migrate.js --seed               – also run 000_seed.sql if present (one-off data)
 *   node migrate.js --list                – show what would run without running it
 *   node migrate.js --up-to <n>          – only run migrations up to and including 00n_xxx.sql
 *
 * Environment variables (used when not passed via flags):
 *   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 *
 * The runner:
 *   1. Connects to MySQL.
 *   2. Ensures the `migrations` tracking table exists (via 001_create_migrations_table.sql).
 *   3. Reads migration files in lexicographic order (001_xxx.sql, 002_xxx.sql, ...).
 *   4. Skips files already recorded in `migrations.filename`.
 *   5. Executes pending files in order, recording each after success.
 *   6. If any file fails, stops and exits with code 1.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dir: null, env: 'development', seed: false, list: false, upTo: null, reset: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' && argv[i + 1]) {
      args.dir = argv[++i];
    } else if (a === '--env' && argv[i + 1]) {
      args.env = argv[++i];
    } else if (a === '--seed') {
      args.seed = true;
    } else if (a === '--list') {
      args.list = true;
    } else if (a === '--up-to' && argv[i + 1]) {
      args.upTo = argv[++i];
    } else if (a === '--reset') {
      args.reset = true;
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Usage: node migrate.js [options]

Options:
  --dir <path>      Path to the directory containing numbered .sql migration files.
                    Default: <project>/server/database
  --env <name>      Which .env file to load. Default: development (uses .env).
                    Use "production" to load .env.production, etc.
  --seed            Also execute 000_seed.sql if present (one-off seed SQL).
  --list            List pending migrations without running them (dry-run).
  --up-to <n>       Only run migrations up to and including 00n_xxx.sql.
                    Example: --up-to 3 runs 001, 002, 003 and nothing newer.
  --reset           Clear the migrations tracking table, then re-run all migrations.
                    Safe for fresh or corrupted DBs: all migration SQL uses CREATE TABLE IF NOT EXISTS.
  --help, -h        Show this help.
`);
}

// Reuse the shared builder so the CLI migrator connects with the same TLS
// settings as the pool and the seeded boot path (required by TiDB Cloud).
const { buildDbConfig: buildSharedDbConfig } = require('./config/dbConfig');

function buildDbConfig() {
  return buildSharedDbConfig({ multipleStatements: true });
}

function resolveMigrationsDir(provided) {
  if (provided) return path.resolve(provided);
  // Default: server/database, resolved relative to this file's location.
  return path.resolve(__dirname, 'database');
}

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

class Migrator {
  /**
   * @param {Object} dbConfig
   * @param {string} migrationDir
   * @param {boolean} includeSeed
   */
  constructor(dbConfig, migrationDir, includeSeed = false) {
    this.dbConfig = dbConfig;
    this.migrationDir = migrationDir;
    this.includeSeed = includeSeed;
  }

  async connect() {
    return mysql.createConnection(this.dbConfig);
  }

  _listFiles() {
    if (!fs.existsSync(this.migrationDir)) {
      throw new Error(`Migrations directory not found: ${this.migrationDir}`);
    }
    const entries = fs.readdirSync(this.migrationDir);
    const sqlFiles = entries
      .filter((f) => /^[0-9]{3}_.*\.sql$/.test(f))
      .map((f) => path.join(this.migrationDir, f))
      .sort();

    if (this.includeSeed) {
      const seedPath = path.join(this.migrationDir, '000_seed.sql');
      if (fs.existsSync(seedPath)) {
        sqlFiles.unshift(seedPath);
      }
    }

    return sqlFiles;
  }

  async ensureMigrationsTable(conn) {
    // 001 itself bootstraps the tracking table.
    const files = this._listFiles();
    const firstFile = files.find((f) => /001_create_migrations_table\.sql$/.test(path.basename(f)));
    if (!firstFile) {
      throw new Error('Missing 001_create_migrations_table.sql — cannot bootstrap migrations table.');
    }
    const sql = fs.readFileSync(firstFile, 'utf8');
    await conn.query(sql);

    // Record 001 as applied so the runner doesn't try to re-execute it
    // (its CREATE TABLE IF NOT EXISTS is idempotent, but we don't want it
    // in the pending list). Ignore duplicate-key errors if already recorded.
    try {
      await this.record(conn, path.basename(firstFile));
    } catch (dup) {
      if (!dup.code || dup.code !== 'ER_DUP_ENTRY') throw dup;
    }
  }

  async getApplied(conn) {
    const [rows] = await conn.query('SELECT filename FROM migrations ORDER BY id');
    return new Set(rows.map((r) => r.filename));
  }

  async record(conn, filename) {
    await conn.query('INSERT INTO migrations (filename) VALUES (?)', [filename]);
  }

  async runAll({ dryRun = false, upTo = null } = {}) {
    const conn = await this.connect();
    try {
      await this.ensureMigrationsTable(conn);
      const applied = await this.getApplied(conn);
      let files = this._listFiles();

      // Filter based on --up-to (by the numeric prefix).
      if (upTo != null) {
        const upToNum = Number(upTo);
        if (!Number.isInteger(upToNum) || upToNum < 1) {
          throw new Error(`--up-to must be a positive integer, got: ${upTo}`);
        }
        files = files.filter((f) => {
          const num = Number(path.basename(f).slice(0, 3));
          return Number.isFinite(num) && num <= upToNum;
        });
      }

      const pending = files.filter((f) => !applied.has(path.basename(f)));

      if (pending.length === 0) {
        const skipped = files.map((f) => path.basename(f));
        return { applied: [], pending: [], skipped };
      }

      const report = { applied: [], pending: [], skipped: [], log: [] };

      for (const filePath of pending) {
        const filename = path.basename(filePath);
        const sql = fs.readFileSync(filePath, 'utf8');

        report.log.push(`[${filename}]`);

        if (dryRun) {
          report.log.push('  -> would run (dry-run)');
          report.pending.push(filename);
          continue;
        }

        try {
          await conn.query(sql);
          await this.record(conn, filename);
          report.applied.push(filename);
          report.log.push('  -> applied');
        } catch (err) {
          const msg = err.message || err;
          report.log.push(`  -> FAILED: ${msg}`);
          throw new Error(`Migration failed: ${filename} — ${msg}`);
        }
      }

      // Populate skipped list with files already applied (present in DB but not in this run's applied list).
      for (const f of files) {
        const name = path.basename(f);
        if (applied.has(name) && !report.applied.includes(name)) {
          if (!report.skipped.includes(name)) {
            report.skipped.push(name);
          }
        }
      }

      return report;
    } finally {
      await conn.end();
    }
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const dbConfig = buildDbConfig();
  const migrationDir = resolveMigrationsDir(args.dir);
  const migrator = new Migrator(dbConfig, migrationDir, args.seed);

  console.log(`Migrations directory: ${migrationDir}`);
  console.log(`Database: ${dbConfig.host}/${dbConfig.database} (as ${dbConfig.user})`);
  if (args.env !== 'development') {
    console.log(`Env file used: .env.${args.env}`);
  }
  if (args.seed) {
    console.log('Seed file (000_seed.sql) will be run first if present.');
  }
  if (args.upTo != null) {
    console.log(`Bounded to migration 00${args.upTo}_*.sql (inclusive).`);
  }
  if (args.list) {
    console.log('Mode: dry-run (--list)');
  }
  console.log('');

  try {
    const report = await migrator.runAll({ dryRun: args.list, upTo: args.upTo });

    if (args.list) {
      console.log('Pending migrations (not yet applied):');
      if (report.pending.length === 0) {
        console.log('  (none — all migrations already applied)');
      } else {
        for (const name of report.pending) {
          console.log(`  - ${name}`);
        }
      }
      if (report.skipped.length) {
        console.log('\nSkipped (already applied or out of range):');
        for (const name of report.skipped) {
          console.log(`  - ${name}`);
        }
      }
      return;
    }

    if (report.applied.length) {
      console.log(`Applied ${report.applied.length} migration(s):`);
      for (const line of report.log) {
        if (line.includes('-> applied')) {
          console.log(`  ${line}`);
        }
      }
    } else {
      console.log('No new migrations to apply.');
    }

    if (report.skipped.length) {
      console.log(`Already applied (skipped): ${report.skipped.join(', ')}`);
    }
  } catch (err) {
    console.error(`\nError: ${err.message || err}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Module export + CLI guard
// ---------------------------------------------------------------------------

module.exports = { Migrator, runMigrations: async (dbConfig, migrationDir, opts = {}) => {
  const migrator = new Migrator(dbConfig, migrationDir, opts.includeSeed);
  return migrator.runAll(opts);
} };

if (require.main === module) {
  (async () => {
    // Load the appropriate .env file before building config.
    const args = parseArgs(process.argv);
    const dotenv = require('dotenv');

    if (args.env === 'development') {
      dotenv.config();
    } else {
      const envPath = path.resolve(__dirname, `.env.${args.env}`);
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded environment from: ${envPath}`);
      } else {
        console.warn(`Warning: .env.${args.env} not found at ${envPath}`);
        dotenv.config();
      }
    }

    // --reset: clear the migrations tracking table so all migrations re-run.
    // Safe because every migration SQL uses CREATE TABLE IF NOT EXISTS.
    if (args.reset) {
      const conn = await mysql.createConnection(buildDbConfig());
      try {
        await conn.query('DELETE FROM migrations');
        console.log('Migrations tracking table cleared.');
      } finally {
        await conn.end();
      }
    }

    try {
      await main();
    } catch (err) {
      console.error('Unhandled error:', err);
      process.exit(1);
    }
  })().catch((err) => {
    console.error('Unhandled error in CLI guard:', err);
    process.exit(1);
  });
}

/**
 * Single source of truth for the MySQL connection settings.
 *
 * The connection pool (config/database.js), the migration runner (migrate.js)
 * and the admin seed (seed.js) must all build their config here. Previously
 * each built its own object and only the pool added `ssl`, so on production
 * (Render + TiDB Cloud) migrations and seeding connected without TLS and were
 * rejected with "Connections using insecure transport are prohibited" while
 * the pool itself connected fine.
 *
 * Always constructing the config in one place stops a caller from silently
 * omitting TLS.
 */
const { getEnv, isProduction } = require('../helper/getEnVName.js');

/**
 * @param {object} [overrides] extra driver options (e.g. connectionLimit,
 *   multipleStatements). Merged last, so they win over the defaults.
 * @returns {import('mysql2').ConnectionOptions}
 */
function buildDbConfig(overrides = {}) {
    const port = Number(getEnv('DB_PORT'));

    return {
        host: getEnv('HOST') || getEnv('DB_HOST') || 'localhost',
        user: getEnv('USER') || getEnv('DB_USER') || 'root',
        password: getEnv('PASSWORD') || getEnv('DB_PASSWORD') || '',
        database: getEnv('DATABASE_NAME') || getEnv('DB_NAME') || 'osas_database',
        ...(Number.isFinite(port) && port > 0 ? { port } : {}),

        // Managed MySQL providers (TiDB Cloud, PlanetScale, Render) reject
        // insecure transport, so every production connection needs TLS.
        ...(isProduction() && {
            ssl: {
                rejectUnauthorized: true,
            },
        }),

        ...overrides,
    };
}

module.exports = { buildDbConfig };

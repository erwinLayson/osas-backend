const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const path = require('path');
const {getEnv, isProduction} = require("./helper/getEnVName.js");


const server = express();

const CLIENT_SIDE_URL = isProduction() ? getEnv("CLIENT_URL_PROD") : getEnv("CLIENT_URL_DEV");

server.use(cors({
    origin: CLIENT_SIDE_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Role'],
    methods: ['GET','POST','PUT','DELETE','OPTIONS']
}));
server.use(express.json());
server.use(cookieParser());


// Router
const authRoutes = require('./routes/authRoutes');
const applicants = require('./routes/applicantRoutes');
const adminRoutes = require("./routes/adminRoutes");
const students = require('./routes/studentRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');


// Serve uploads directory for document/image access
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

server.use('/auth', authRoutes);
server.use('/applicants', applicants);
server.use('/admin', adminRoutes);
server.use('/students', students);
server.use('/scholarships', scholarshipRoutes);
server.use('/reports', reportRoutes);
server.use('/settings', settingsRoutes);

// Centralized error handler (must be after all routes)
const { errorHandler } = require('./middleware/errorHandler');
server.use(errorHandler);

// Database config — built by the shared helper so the pool, the migration
// runner and the seed all use identical settings, including TLS in production.
const { buildDbConfig } = require('./config/dbConfig');
const dbConfig = buildDbConfig();

async function boot() {
    const migrate = require('./migrate');
    const migrationDir = path.join(__dirname, 'database');

    // Run pending migrations before accepting traffic
    try {
        const res = await migrate.runMigrations(dbConfig, migrationDir);
        if (res.applied.length) {
            console.log(`Migrations applied: ${res.applied.join(', ')}`);
        } else {
            console.log('No new migrations to apply');
        }
    } catch (mErr) {
        // Don't crash the server if a migration is non-fatal; log and continue.
        console.warn('Migration run failed (non-fatal):', mErr.message || mErr);
    }

    // Ensure a default admin account exists so the portal is usable on first start.
    try {
        const seed = require('./seed');
        // seed.js exports an async function when required in module context.
        if (typeof seed === 'function') {
            await seed();
        } else if (seed && typeof seed.default === 'function') {
            await seed.default();
        }
    } catch (sErr) {
        console.warn('Default admin seed skipped/failed (non-fatal):', sErr.message || sErr);
    }

    server.listen(3000, () => {
        console.log("server is running in http://localhost:3000");
    });
}

boot().catch((e) => {
    console.error('Failed to start server:', e);
    process.exit(1);
});
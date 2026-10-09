const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const server = express();

server.use(cors({
    origin: "http://localhost:5173",
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

// Database config (same shape used by the existing database.js)
const dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "osas_database"
};

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

    server.listen(3000, () => {
        console.log("server is running in http://localhost:3000");
    });
}

boot().catch((e) => {
    console.error('Failed to start server:', e);
    process.exit(1);
});
const express = require('express');
const authController = require('../controller/authController');

const authRoutes = express.Router();

// Shared login for both admin and student.
authRoutes.post('/login', authController.login);

// Identify the current user + role (used by client route guards).
authRoutes.get('/me', authController.me);

// Clear all sessions.
authRoutes.post('/logout', authController.logout);

module.exports = authRoutes;

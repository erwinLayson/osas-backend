const express = require('express');
const router = express.Router();
const applicantsController = require('../controller/applicantController');
const { authenticateAdmin, requireRole } = require("../authenticate/auth");

// Applicant registration - publicly accessible (no auth required)
router.post('/register', applicantsController.createApplicant);

module.exports = router;


module.exports = router;

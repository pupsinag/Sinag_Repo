const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { assignSupervisor } = require('../controllers/internController');

// Assign supervisor to intern
router.post('/assign-supervisor', authMiddleware(), assignSupervisor);

module.exports = router;

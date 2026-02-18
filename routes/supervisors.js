const express = require('express');
const router = express.Router();
const { getSupervisorById } = require('../controllers/supervisorController');
const authMiddleware = require('../middleware/authMiddleware');

// Get supervisor by ID
router.get('/:id', authMiddleware(), getSupervisorById);

module.exports = router;

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getInterns } = require('../controllers/internInDashboardController');

// 🟢 Allow both adviser and coordinator to access
router.get('/interns', authMiddleware(['adviser', 'coordinator']), getInterns);

module.exports = router;

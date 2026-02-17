const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getInterns } = require('../controllers/internInDashboardController');

router.get('/interns', authMiddleware('adviser'), getInterns);

module.exports = router;

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateInternAssignedToHTE } = require('../controllers/internAssignedToHTEController');

router.post('/interns-by-hte', authMiddleware(), generateInternAssignedToHTE);

module.exports = router;

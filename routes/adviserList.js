const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateAdviserList } = require('../controllers/adviserListController');

router.get('/advisers', authMiddleware(), generateAdviserList);

module.exports = router;

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const { generateInternList } = require('../controllers/hteListController');
const { generateHTEList } = require('../controllers/hteListController');

/* =============================
   REPORTS (PDF)
============================== */
router.get('/hte-list', authMiddleware(), generateHTEList); // ✅ ADD THIS

module.exports = router;

const express = require('express');
const router = express.Router();

// ✅ IMPORT CONTROLLER (NOT THE MODEL)
const { createEvaluation } = require('../controllers/internEvaluationController');

// =========================
// CREATE INTERN EVALUATION
// =========================
router.post('/', createEvaluation);

module.exports = router;

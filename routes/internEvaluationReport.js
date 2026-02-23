const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateInternEvaluationReport } = require('../controllers/internEvaluationReportController');
const { generateInternToHTEEvaluationSummary } = require('../controllers/internToHTEEvaluationSummaryController');
const {
  generateInternToSupervisorEvaluationSummary,
} = require('../controllers/internToSupervisorEvaluationSummaryController');

router.post('/intern-evaluations', authMiddleware(['adviser', 'coordinator']), generateInternEvaluationReport);
router.post('/intern-to-hte-evaluation-summary', authMiddleware(['adviser', 'coordinator']), generateInternToHTEEvaluationSummary);
router.post('/intern-to-supervisor-evaluation-summary', authMiddleware(['adviser', 'coordinator']), generateInternToSupervisorEvaluationSummary);

module.exports = router;

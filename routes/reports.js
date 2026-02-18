const express = require('express');
const router = express.Router();
const internToSupervisorEvaluationSummaryController = require('../controllers/internToSupervisorEvaluationSummaryController');
const internAssignedToHTEController = require('../controllers/internAssignedToHTEController');
const internEvaluationReportController = require('../controllers/internEvaluationReportController');
const adviserListController = require('../controllers/adviserListController');

// Get available years/sections for a program
router.get('/intern-evaluations/years', async (req, res, next) => {
  try {
    const programId = req.query.programId;
    if (!programId) {
      return res.status(400).json({ error: 'Program ID is required' });
    }
    const result = await internToSupervisorEvaluationSummaryController.getAvailableYears(programId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get interns by HTE with cascading logic
router.post('/interns-by-hte', async (req, res, next) => {
  try {
    await internAssignedToHTEController.generateInternAssignedToHTE(req, res);
  } catch (error) {
    next(error);
  }
});

// Get advisers list
router.get('/advisers', async (req, res, next) => {
  try {
    await adviserListController.generateAdviserList(req, res);
  } catch (error) {
    next(error);
  }
});

// Get intern evaluations with cascading logic
router.post('/intern-evaluations', async (req, res, next) => {
  try {
    await internEvaluationReportController.generateInternEvaluationReport(req, res);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/intern-to-supervisor-evaluation-summary',
  internToSupervisorEvaluationSummaryController.generateInternToSupervisorEvaluationSummary,
);

// Error handling middleware (must be last)
router.use((err, req, res, next) => {
  console.error('Reports route error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

module.exports = router;

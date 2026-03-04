const express = require('express');
const router = express.Router();
const controller = require('../controllers/supervisorEvaluationController');
const auth = require('../middleware/authMiddleware');

// ✅ TEST ENDPOINT
router.get('/test', (req, res) => {
  res.json({ message: 'SupervisorEvaluations test endpoint working' });
});

// ✅ NEW: GET evaluation settings (NO auth needed - public endpoint)
router.get('/settings', controller.getEvaluationSettings);

// Debug: log when POST is received at the route level
router.post(
  '/',
  (req, res, next) => {
    console.log('[DEBUG] POST /api/supervisor-evaluations route hit');
    next();
  },
  auth(), // <-- FIX: call the middleware function
  async (req, res, next) => {
    console.log('[ROUTE] POST /api/supervisor-evaluations hit');
    try {
      await controller.submitEvaluation(req, res, next);
    } catch (err) {
      console.error('[ERROR] submitEvaluation threw:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  },
);

module.exports = router;

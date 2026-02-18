const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const settingsController = require('../controllers/evaluationSettingsController');

// Get current evaluation settings (accessible to all authenticated users)
router.get(
  '/settings',
  authMiddleware(['coordinator', 'adviser', 'intern', 'company']),
  settingsController.getSettings,
);

// Update evaluation settings (coordinator only)
router.put('/settings', authMiddleware(['coordinator']), settingsController.updateSettings);

// Toggle specific evaluation (coordinator only)
router.post('/settings/toggle', authMiddleware(['coordinator']), settingsController.toggleEvaluation);

module.exports = router;

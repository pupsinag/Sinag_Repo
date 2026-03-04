const evaluationSettings = require('../services/evaluationSettingsService');

/**
 * Get current evaluation settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = evaluationSettings.getSettings();
    // Debug: Log the supervisorEvaluationActive value
    console.log('[DEBUG] supervisorEvaluationActive (backend):', settings.supervisorEvaluationActive);
    res.json(settings);
  } catch (error) {
    console.error('❌ Error fetching evaluation settings:', error);
    res.status(500).json({ message: 'Failed to fetch evaluation settings' });
  }
};

/**
 * Update evaluation settings (coordinator only)
 */
exports.updateSettings = async (req, res) => {
  try {
    const { internEvaluationActive, hteEvaluationActive, supervisorEvaluationActive } = req.body;
    const userId = req.user?.id || null;

    const updates = {};
    if (typeof internEvaluationActive === 'boolean') {
      updates.internEvaluationActive = internEvaluationActive;
    }
    if (typeof hteEvaluationActive === 'boolean') {
      updates.hteEvaluationActive = hteEvaluationActive;
    }
    if (typeof supervisorEvaluationActive === 'boolean') {
      updates.supervisorEvaluationActive = supervisorEvaluationActive;
    }

    const updatedSettings = evaluationSettings.updateSettings(updates, userId);

    res.json({
      message: 'Evaluation settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('❌ Error updating evaluation settings:', error);
    res.status(500).json({ message: 'Failed to update evaluation settings' });
  }
};

/**
 * Toggle a specific evaluation type
 */
exports.toggleEvaluation = async (req, res) => {
  try {
    const { type, isActive } = req.body;
    const userId = req.user?.id || null;

    if (!['intern', 'hte', 'supervisor'].includes(type)) {
      return res.status(400).json({ message: 'Invalid evaluation type' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const updatedSettings = evaluationSettings.toggleEvaluation(type, isActive, userId);

    res.json({
      message: `${type} evaluation ${isActive ? 'activated' : 'deactivated'} successfully`,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('❌ Error toggling evaluation:', error);
    res.status(500).json({ message: 'Failed to toggle evaluation' });
  }
};

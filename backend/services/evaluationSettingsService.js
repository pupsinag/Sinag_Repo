const fs = require('fs');
const path = require('path');

// Path to store settings
const SETTINGS_FILE = path.join(__dirname, '..', 'config', 'evaluation-settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  internEvaluationActive: false,
  hteEvaluationActive: false,
  supervisorEvaluationActive: false,
  lastUpdated: new Date().toISOString(),
  updatedBy: null,
};

/**
 * Initialize settings file if it doesn't exist
 */
const initializeSettings = () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
      console.log('✅ Evaluation settings file initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing evaluation settings:', error);
  }
};

/**
 * Get current evaluation settings
 */
const getSettings = () => {
  try {
    // Debug: Log the absolute path being read
    console.log('[DEBUG] Reading evaluation settings from:', SETTINGS_FILE);
    initializeSettings();
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error reading evaluation settings:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Update evaluation settings
 */
const updateSettings = (newSettings, userId = null) => {
  try {
    const currentSettings = getSettings();
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      lastUpdated: new Date().toISOString(),
      updatedBy: userId,
    };

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2));
    console.log('✅ Evaluation settings updated:', updatedSettings);
    return updatedSettings;
  } catch (error) {
    console.error('❌ Error updating evaluation settings:', error);
    throw error;
  }
};

/**
 * Check if a specific evaluation type is active
 */
const isEvaluationActive = (evaluationType) => {
  const settings = getSettings();
  switch (evaluationType) {
    case 'intern':
      return settings.internEvaluationActive || false;
    case 'hte':
      return settings.hteEvaluationActive || false;
    case 'supervisor':
      return settings.supervisorEvaluationActive || false;
    default:
      return false;
  }
};

/**
 * Toggle a specific evaluation type
 */
const toggleEvaluation = (evaluationType, isActive, userId = null) => {
  const key = `${evaluationType}EvaluationActive`;
  return updateSettings({ [key]: isActive }, userId);
};

module.exports = {
  getSettings,
  updateSettings,
  isEvaluationActive,
  toggleEvaluation,
  initializeSettings,
};

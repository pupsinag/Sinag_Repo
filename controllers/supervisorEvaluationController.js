/* eslint-env node */
/**
 * ✅ COMPLETE SUPERVISOR EVALUATION CONTROLLER
 * - Checks if supervisor evaluations are active
 * - Validates evaluation settings before submission
 * - All required imports included
 */

const db = require('../models');
const { sequelize } = db;
const { InternEvaluation, InternEvaluationItem } = db;

// ✅ Use evaluationSettingsService for settings
const evaluationSettingsService = require('../services/evaluationSettingsService');

function getEvaluationSettings() {
  // Synchronous read from JSON file (matches rest of app)
  return evaluationSettingsService.getSettings();
}

// Helper: Validate required fields
function validateFields(body) {
  const missing = [];
  if (!body.intern_id) missing.push('intern_id');
  if (!body.supervisor_id) missing.push('supervisor_id');
  if (!body.company_id) missing.push('company_id');
  if (!body.academic_year) missing.push('academic_year');
  if (!body.semester) missing.push('semester');
  if (!Array.isArray(body.items) || body.items.length === 0) missing.push('items (non-empty array)');
  return missing;
}

// Helper: Validate items structure
function validateItems(items) {
  return items.filter((item) => !item.section || !item.indicator || typeof item.rating !== 'number');
}

/**
 * GET /api/supervisor-evaluations/settings
 * Returns current evaluation settings
 */
exports.getEvaluationSettings = async (req, res) => {
  try {
    console.log('[getEvaluationSettings] Fetching evaluation settings...');
    const settings = await getEvaluationSettings();
    console.log('[getEvaluationSettings] Settings:', settings);
    // Prevent caching of evaluation settings
    res.set('Cache-Control', 'no-store');
    return res.status(200).json(settings);
  } catch (error) {
    console.error('[EvalSettings] Error fetching settings:', error);
    return res.status(500).json({
      message: 'Failed to fetch evaluation settings',
      error: error.message,
    });
  }
};

/**
 * POST /api/supervisor-evaluations
 * Submit a supervisor evaluation
 */
exports.submitEvaluation = async (req, res, next) => {
  console.log('[SUPERVISOR_EVAL_CONTROLLER] >>> ENTERED submitEvaluation');
  console.log('[SUPERVISOR_EVAL_CONTROLLER] Received POST /api/supervisor-evaluations');
  console.log('[SUPERVISOR_EVAL_CONTROLLER] req.user:', req.user);
  console.log('[SUPERVISOR_EVAL_CONTROLLER] req.body:', req.body);
  let step = 0;
  const logStep = (msg) => {
    step++;
    console.log(`[SUPERVISOR_EVAL_CONTROLLER] STEP ${step}: ${msg}`);
  };

  // Add a timeout failsafe (for debugging)
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('[SUPERVISOR_EVAL_CONTROLLER] Timeout reached, sending 504');
      res.status(504).json({ message: 'Server timeout' });
    }
  }, 25000);

  let transaction;
  try {
    logStep('Checking if supervisor evaluations are active');
    const isActive = evaluationSettingsService.isEvaluationActive('supervisor');
    logStep('Supervisor evaluation active: ' + isActive);
    if (!isActive) {
      console.warn('[SupervisorEval] Submission attempted but evaluations are closed');
      return res.status(403).json({
        message: 'Supervisor evaluations are currently closed. Please try again during the evaluation period.',
        userTip: 'Contact your coordinator if you believe this is an error.',
      });
    }

    // Entry log only
    console.log(`[EVAL] Submission started for intern ${req.body.intern_id}`);

    // Validate input
    const missingFields = validateFields(req.body);
    if (missingFields.length > 0) {
      return res.status(400).json({ message: 'Missing fields', missingFields });
    }
    if (req.body.items.length > 100) {
      return res.status(400).json({ message: 'Too many items (max 100)' });
    }
    // NEW: Validate items structure
    const invalidItems = validateItems(req.body.items);
    if (invalidItems.length > 0) {
      return res.status(400).json({ message: 'Invalid item structure', invalidItems });
    }

    transaction = await sequelize.transaction();
    try {
      console.log('[SUPERVISOR_EVAL_CONTROLLER] Checking DB connection...');
      await sequelize.authenticate();
      console.log('[SUPERVISOR_EVAL_CONTROLLER] DB connection OK');
      logStep('Checking for existing evaluation');
      const existingEvaluation = await InternEvaluation.findOne({
        where: {
          intern_id: req.body.intern_id,
          evaluator: req.body.supervisorName || `Supervisor ${req.body.supervisor_id}`,
        },
        attributes: ['id', 'intern_id', 'evaluator', 'designation', 'date'],
        transaction,
      });
      logStep('Existing evaluation checked');
      if (existingEvaluation) {
        await transaction.rollback();
        return res.status(409).json({
          message: 'Evaluation already submitted',
          evaluationId: existingEvaluation.id,
        });
      }

      logStep('Creating evaluation');
      const evaluation = await InternEvaluation.create(
        {
          intern_id: req.body.intern_id,
          internName: 'Intern', // Will be populated from lookup if needed
          evaluator: req.body.supervisorName || `Supervisor ${req.body.supervisor_id}`,
          designation: 'SUPERVISOR',
          date: new Date(),
          totalScore: req.body.items.reduce((sum, item) => sum + (item.rating || 0), 0),
          hteName: req.body.company_id?.toString() || '', // Store company_id as reference
          jobDescription: JSON.stringify({
            supervisor_id: req.body.supervisor_id,
            company_id: req.body.company_id,
            academic_year: req.body.academic_year,
            semester: req.body.semester,
            evaluation_type: 'supervisor',
          }),
          remarks: req.body.remarks || null,
        },
        { transaction },
      );
      logStep('Evaluation created');

      logStep('Bulk creating items');
      const itemsToCreate = req.body.items.map((item) => ({
        evaluationId: evaluation.id,
        category: item.section || 'Supervisor',
        itemText: item.indicator,
        score: item.rating || 0,
        maxScore: item.maxScore || (item.section === 'Character' ? 10 : 5),
      }));
      await InternEvaluationItem.bulkCreate(itemsToCreate, {
        transaction,
        validate: true,
      });
      logStep('Items created');

      await transaction.commit();
      logStep('Transaction committed');
      console.log(`[EVAL] Submission completed: ${evaluation.id}`);
      return res.status(201).json({
        message: 'Evaluation submitted successfully',
        evaluationId: evaluation.id,
      });
    } catch (error) {
      await transaction.rollback();
      console.error('[SUPERVISOR_EVAL_CONTROLLER] DB error:', error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error submitting evaluation:', error.message);
    console.error('Full error stack:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      message: 'Failed to submit evaluation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage || error.code : undefined,
    });
  }
};

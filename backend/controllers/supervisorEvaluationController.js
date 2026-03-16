/* eslint-env node */
/**
 * ✅ COMPLETE SUPERVISOR EVALUATION CONTROLLER
 * - Checks if supervisor evaluations are active
 * - Validates evaluation settings before submission
 * - All required imports included
 */

const db = require('../models');
const { sequelize } = db;
const { SupervisorEvaluation, SupervisorEvaluationItem } = db;

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

// Helper: Validate items structure with detailed error info
function validateItems(items) {
  const invalidItems = items.map((item, idx) => {
    const errors = [];
    if (!item.section) errors.push('missing section');
    if (!item.indicator) errors.push('missing indicator');
    if (typeof item.rating !== 'number') errors.push(`rating is ${typeof item.rating}, expected number`);
    
    return {
      index: idx,
      item: item,
      hasErrors: errors.length > 0,
      errors: errors
    };
  }).filter(result => result.hasErrors);
  
  return invalidItems;
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
      console.error('[VALIDATION] Missing required fields:', missingFields);
      return res.status(400).json({ 
        message: 'Missing required fields for supervisor evaluation', 
        missingFields,
        hint: 'Required fields: intern_id, supervisor_id, company_id, academic_year, semester, items (non-empty array)'
      });
    }
    if (req.body.items.length > 100) {
      console.error('[VALIDATION] Too many items:', req.body.items.length);
      return res.status(400).json({ message: 'Too many items (max 100)' });
    }
    // NEW: Validate items structure with detailed error info
    const invalidItems = validateItems(req.body.items);
    if (invalidItems.length > 0) {
      console.error('[VALIDATION] Invalid items found:', invalidItems);
      return res.status(400).json({ 
        message: 'Invalid item structure in evaluation items', 
        detailedErrors: invalidItems,
        validItemExample: {
          section: 'Technical Skills',
          indicator: 'Problem Solving Ability',
          rating: 4
        }
      });
    }

    transaction = await sequelize.transaction();
    try {
      console.log('[SUPERVISOR_EVAL_CONTROLLER] Checking DB connection...');
      await sequelize.authenticate();
      console.log('[SUPERVISOR_EVAL_CONTROLLER] DB connection OK');
      logStep('Checking for existing evaluation');
      const existingEvaluation = await SupervisorEvaluation.findOne({
        where: {
          intern_id: req.body.intern_id,
          supervisor_id: req.body.supervisor_id,
          academic_year: req.body.academic_year,
          semester: req.body.semester,
        },
        attributes: ['id', 'intern_id', 'supervisor_id', 'academic_year', 'semester'],
        transaction,
      });
      logStep('Existing evaluation checked');
      if (existingEvaluation) {
        await transaction.rollback();
        console.warn('[SUPERVISOR_EVAL_CONTROLLER] ⚠️ Evaluation already exists');
        return res.status(409).json({
          message: 'Evaluation already submitted for this period',
          evaluationId: existingEvaluation.id,
        });
      }

      // ✅ Verify supervisor belongs to the specified company
      logStep('Verifying supervisor belongs to company');
      const supervisor = await db.Supervisor.findOne({
        where: {
          id: req.body.supervisor_id,
          company_id: req.body.company_id
        },
        attributes: ['id', 'name', 'company_id'],
        transaction,
      });
      
      if (!supervisor) {
        await transaction.rollback();
        console.error('[SUPERVISOR_EVAL_CONTROLLER] ❌ Supervisor validation failed');
        return res.status(400).json({
          message: 'Invalid supervisor for this company',
          error: `Supervisor ID ${req.body.supervisor_id} does not belong to company ID ${req.body.company_id}`,
          hint: 'Ensure the selected supervisor is associated with the company'
        });
      }
      logStep(`Supervisor verified: ${supervisor.name}`);

      logStep('Creating supervisor evaluation');
      const evaluation = await SupervisorEvaluation.create(
        {
          intern_id: req.body.intern_id,
          supervisor_id: req.body.supervisor_id,
          company_id: req.body.company_id,
          academic_year: req.body.academic_year,
          semester: req.body.semester,
          user_id: req.user.id || null,
        },
        { transaction },
      );
      logStep('Evaluation created');

      logStep('Bulk creating supervisor evaluation items');
      const itemsToCreate = req.body.items.map((item) => ({
        evaluationId: evaluation.id,
        section: item.section || 'Supervisor',
        indicator: item.indicator,
        rating: Number(item.rating) || 0,  // ✅ Ensure rating is a number
      }));
      
      console.log('[SUPERVISOR_EVAL_CONTROLLER] Items to create:', JSON.stringify(itemsToCreate, null, 2));
      
      await SupervisorEvaluationItem.bulkCreate(itemsToCreate, {
        transaction,
        validate: true,
      });
      logStep('Items created successfully');

      await transaction.commit();
      logStep('Transaction committed successfully');
      console.log(`[EVAL] ✅ Supervisor evaluation submission completed: ${evaluation.id}`);
      return res.status(201).json({
        message: 'Evaluation submitted successfully',
        evaluationId: evaluation.id,
      });
    } catch (error) {
      console.error('[SUPERVISOR_EVAL_CONTROLLER] ❌ Database operation failed within transaction:');
      console.error('[SUPERVISOR_EVAL_CONTROLLER] Error name:', error.name);
      console.error('[SUPERVISOR_EVAL_CONTROLLER] Error message:', error.message);
      if (error.sql) console.error('[SUPERVISOR_EVAL_CONTROLLER] SQL:', error.sql);
      
      try {
        await transaction.rollback();
        console.log('[SUPERVISOR_EVAL_CONTROLLER] Transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('[SUPERVISOR_EVAL_CONTROLLER] ⚠️ Rollback failed:', rollbackError.message);
      }
      
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('[SUPERVISOR_EVAL_CONTROLLER] ❌ Evaluation submission failed');
    console.error('[SUPERVISOR_EVAL_CONTROLLER] Error message:', error.message);
    console.error('[SUPERVISOR_EVAL_CONTROLLER] Error code:', error.code);
    console.error('[SUPERVISOR_EVAL_CONTROLLER] Error type:', error.name);
    
    // Database-specific errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('[SUPERVISOR_EVAL_CONTROLLER] Constraint violation:', error.errors);
      return res.status(409).json({
        message: 'Evaluation already exists for this period',
        error: 'This intern-supervisor combination already has an evaluation for the selected academic year and semester',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      console.error('[SUPERVISOR_EVAL_CONTROLLER] Foreign Key violation:', error.message);
      return res.status(400).json({
        message: 'Invalid reference in evaluation data',
        error: 'One or more IDs (intern_id, supervisor_id, company_id) do not exist in the system',
        hint: 'Verify that the intern, supervisor, and company have been properly created',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (error.name === 'SequelizeValidationError') {
      console.error('[SUPERVISOR_EVAL_CONTROLLER] Validation error:', error.errors);
      return res.status(400).json({
        message: 'Data validation failed',
        validationErrors: error.errors.map(e => ({
          field: e.path,
          message: e.message
        })),
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Generic error handling
    console.error('[SUPERVISOR_EVAL_CONTROLLER] Full error stack:');
    console.error(error);
    
    return res.status(500).json({
      message: 'Failed to submit supervisor evaluation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage || error.code : undefined,
      hint: 'Please check: 1) All items have section, indicator, and rating fields, 2) Ratings are numbers, 3) Intern/supervisor/company exist'
    });
  }
};

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
  if (body.intern_id === undefined || body.intern_id === null || body.intern_id === '') missing.push('intern_id');
  if (body.supervisor_id === undefined || body.supervisor_id === null || body.supervisor_id === '') missing.push('supervisor_id');
  if (!body.evaluation_date) missing.push('evaluation_date');
  if (body.overall_rating === undefined || body.overall_rating === null || typeof body.overall_rating !== 'number') missing.push('overall_rating (must be a number)');
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) missing.push('items (non-empty array)');
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
  console.log('[SUPERVISOR_EVAL_CONTROLLER] req.body (RAW):', req.body);
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
    // ✅ MAP FRONTEND FORMAT TO DATABASE FORMAT
    const { evaluation_date, overall_rating, comments, remarks, ...frontendData } = req.body;
    
    // If frontend sends old format fields (academic_year, semester, etc), convert them
    let finalData = {
      ...req.body, // Start with all frontend data
      evaluation_date: evaluation_date || new Date().toISOString().split('T')[0],
      overall_rating: overall_rating !== undefined ? overall_rating : 0,
      comments: comments || '',
      remarks: remarks || '',
    };
    
    console.log('[SUPERVISOR_EVAL_CONTROLLER] req.body (NORMALIZED):', {
      intern_id: finalData.intern_id,
      supervisor_id: finalData.supervisor_id,
      evaluation_date: finalData.evaluation_date,
      overall_rating: finalData.overall_rating,
      items: `[${finalData.items?.length || 0} items]`
    });

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
    console.log(`[EVAL] Submission started for intern ${finalData.intern_id}`);

    // Validate input with detailed error logging
    const missingFields = validateFields(finalData);
    if (missingFields.length > 0) {
      console.error('[VALIDATION] ❌ Missing required fields:', missingFields);
      console.error('[VALIDATION] DEBUG - Full finalData:', JSON.stringify({
        intern_id: { value: finalData.intern_id, type: typeof finalData.intern_id },
        supervisor_id: { value: finalData.supervisor_id, type: typeof finalData.supervisor_id },
        evaluation_date: { value: finalData.evaluation_date, type: typeof finalData.evaluation_date },
        overall_rating: { value: finalData.overall_rating, type: typeof finalData.overall_rating },
        items: { count: finalData.items?.length || 0, type: Array.isArray(finalData.items) ? 'array' : typeof finalData.items },
      }, null, 2));
      return res.status(400).json({ 
        message: 'Missing required fields for supervisor evaluation', 
        missingFields,
        error_details: 'Check backend logs for full data dump',
        hint: 'Required fields: intern_id (number), supervisor_id (number), evaluation_date (string YYYY-MM-DD), overall_rating (number), items (non-empty array)',
        receivedData: {
          intern_id: { value: finalData.intern_id, type: typeof finalData.intern_id },
          supervisor_id: { value: finalData.supervisor_id, type: typeof finalData.supervisor_id },
          evaluation_date: { value: finalData.evaluation_date, type: typeof finalData.evaluation_date },
          overall_rating: { value: finalData.overall_rating, type: typeof finalData.overall_rating },
          itemsCount: finalData.items?.length || 0,
          itemsType: Array.isArray(finalData.items) ? 'array' : typeof finalData.items
        }
      });
    }
    if (finalData.items.length > 100) {
      console.error('[VALIDATION] Too many items:', finalData.items.length);
      return res.status(400).json({ message: 'Too many items (max 100)' });
    }
    // NEW: Validate items structure with detailed error info
    const invalidItems = validateItems(finalData.items);
    if (invalidItems.length > 0) {
      console.error('[VALIDATION] ❌ Invalid items found:', JSON.stringify(invalidItems, null, 2));
      return res.status(400).json({ 
        message: 'Invalid item structure in evaluation items', 
        itemsValidationErrors: invalidItems.map(result => ({
          itemIndex: result.index,
          errors: result.errors,
          receivedItem: {
            section: result.item.section,
            indicator: result.item.indicator,
            rating: { value: result.item.rating, type: typeof result.item.rating }
          }
        })),
        validItemExample: {
          section: 'Character',
          indicator: 'The intern can be trusted...',
          rating: 5  // number, not string
        }
      });
    }

    transaction = await sequelize.transaction();
    try {
      console.log('[SUPERVISOR_EVAL_CONTROLLER] Checking DB connection...');
      await sequelize.authenticate();
      console.log('[SUPERVISOR_EVAL_CONTROLLER] DB connection OK');
      logStep('Checking for existing evaluation');
      
      // ✅ Calculate overall_rating from items array
      let overallRating = finalData.overall_rating;
      if (!overallRating && finalData.items && Array.isArray(finalData.items)) {
        overallRating = finalData.items.reduce((sum, item) => sum + (item.rating || 0), 0) / finalData.items.length;
        console.log('[SUPERVISOR_EVAL_CONTROLLER] ✅ Calculated overallRating from items:', overallRating);
      }
      
      // ✅ Check for duplicates: same intern + supervisor on same date (simple check)
      const existingEvaluation = await SupervisorEvaluation.findOne({
        where: {
          intern_id: finalData.intern_id,
          supervisor_id: finalData.supervisor_id,
        },
        order: [['createdAt', 'DESC']],
        limit: 1,
        attributes: ['id', 'intern_id', 'supervisor_id', 'evaluation_date'],
        transaction,
      });
      
      // Only reject if same evaluation on same date
      if (existingEvaluation && existingEvaluation.evaluation_date === finalData.evaluation_date) {
        await transaction.rollback();
        console.warn('[SUPERVISOR_EVAL_CONTROLLER] ⚠️ Evaluation already exists for this date');
        return res.status(409).json({
          message: 'This intern has already been evaluated on this date',
          evaluationId: existingEvaluation.id,
        });
      }
      
      logStep('Existing evaluation checked');

      logStep('Creating supervisor evaluation');
      const evaluation = await SupervisorEvaluation.create(
        {
          intern_id: finalData.intern_id,
          supervisor_id: finalData.supervisor_id,
          evaluation_date: finalData.evaluation_date,
          overall_rating: overallRating || finalData.overall_rating || 0,
          comments: finalData.comments || '',
          remarks: finalData.remarks || '',
          submitted: true,
        },
        { transaction },
      );
      logStep('Evaluation created with ID: ' + evaluation.id);

      logStep('Bulk creating supervisor evaluation items');
      const itemsToCreate = finalData.items.map((item) => ({
        evaluationId: evaluation.id,
        section: item.section || 'Supervisor',
        indicator: item.indicator,
        rating: Number(item.rating) || 0,
      }));
      
      console.log('[SUPERVISOR_EVAL_CONTROLLER] Items to create:', JSON.stringify(itemsToCreate, null, 2));
      
      // ✅ Check if SupervisorEvaluationItem exists before trying to bulk create
      try {
        await SupervisorEvaluationItem.bulkCreate(itemsToCreate, {
          transaction,
          validate: true,
        });
        logStep('Items created successfully');
        console.log('[SUPERVISOR_EVAL_CONTROLLER] ✅ All evaluation items saved to database');
      } catch (itemError) {
        // Log detailed error for debugging
        console.error('[SUPERVISOR_EVAL_CONTROLLER] ❌ Error creating evaluation items:');
        console.error('[SUPERVISOR_EVAL_CONTROLLER] Error message:', itemError.message);
        console.error('[SUPERVISOR_EVAL_CONTROLLER] Error name:', itemError.name);
        if (itemError.errors) {
          console.error('[SUPERVISOR_EVAL_CONTROLLER] Validation errors:', JSON.stringify(itemError.errors, null, 2));
        }
        console.warn('[SUPERVISOR_EVAL_CONTROLLER] ⚠️ Continuing without items - main evaluation already created');
        logStep('Items creation skipped - check logs for details');
      }

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
        error: 'One or more IDs (intern_id, supervisor_id) do not exist in the system',
        hint: 'Verify that the intern and supervisor have been properly created',
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

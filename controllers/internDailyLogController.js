'use strict';

const path = require('path');

// ✅ LAZY LOAD - Require models inside functions to avoid circular dependency
function getModels() {
  return require('../models');
}

exports.createDailyLog = async (req, res) => {
  try {
    const { InternDailyLog, Intern } = getModels();
    const { log_date, time_in, time_out, tasks_accomplished, skills_enhanced, learning_applied } = req.body;

    console.log('\n=== CREATE DAILY LOG ===');
    console.log('📥 Received body:', {
      log_date,
      time_in,
      time_out,
      tasks_accomplished: tasks_accomplished?.substring(0, 20) + '...',
    });
    console.log('📁 Files info:', req.files && req.files.length > 0 ? `${req.files.length} file(s)` : 'No files');

    /* =========================
       VALIDATION
    ========================= */
    if (!log_date || !time_in || !time_out || !tasks_accomplished) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    /* =========================
       RESOLVE INTERN (AUTHORITY)
    ========================= */
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      console.error('❌ Intern not found for user_id:', req.user.id);
      return res.status(404).json({ message: 'Intern not found' });
    }

    console.log('✅ Intern found - ID:', intern.id);

    /* =========================
       AUTO DAY NUMBER
    ========================= */
    const day_no = (await InternDailyLog.count({ where: { intern_id: intern.id } })) + 1;
    console.log('📊 Day number auto-calculated:', day_no);

    /* =========================
       PREVENT DUPLICATE DATE
    ========================= */
    const exists = await InternDailyLog.findOne({
      where: {
        intern_id: intern.id,
        log_date,
      },
    });

    if (exists) {
      console.error('❌ Duplicate log found for date:', log_date);
      return res.status(409).json({ message: 'Daily log already exists for this date' });
    }

    /* =========================
       CALCULATE HOURS
    ========================= */
    const [inH, inM] = time_in.split(':').map(Number);
    const [outH, outM] = time_out.split(':').map(Number);

    let start = inH * 60 + inM;
    let end = outH * 60 + outM;

    // Handle overnight shifts
    if (end < start) end += 24 * 60;

    const total_hours = Number(((end - start) / 60).toFixed(2));
    console.log('⏱️ Calculated hours:', `${time_in} to ${time_out} = ${total_hours} hours`);

    /* =========================
       HANDLE PHOTO UPLOADS
    ========================= */
    let photo_paths = null;

    if (req.files && req.files.length > 0) {
      // ✅ Store array of filenames
      photo_paths = req.files.map(f => f.filename);
      console.log('✅ Photos saved successfully');
      req.files.forEach((file, index) => {
        console.log(`   File ${index + 1}:`, file.filename);
        console.log(`   Size:`, (file.size / 1024).toFixed(2), 'KB');
      });
    } else {
      console.log('ℹ️ No photos attached (optional field)');
    }

    /* =========================
       CREATE LOG IN DATABASE
    ========================= */
    let log;
    try {
      log = await InternDailyLog.create({
        intern_id: intern.id,
        day_no,
        log_date,
        time_in,
        time_out,
        total_hours,
        tasks_accomplished,
        skills_enhanced: skills_enhanced || null,
        learning_applied: learning_applied || null,
        photo_path: photo_paths, // ✅ Save array of photo paths to database
      });
    } catch (err) {
      // If columns don't exist yet, insert into legacy schema
      if (err.message.includes("Unknown column")) {
        console.warn('⚠️ Column not found, using legacy schema insert');
        const sequelize = require('../config/database');
        const dateStr = log_date instanceof Date ? log_date.toISOString().split('T')[0] : log_date;
        
        const [createdLog] = await sequelize.query(
          `INSERT INTO intern_daily_logs 
           (intern_id, date, logDate, hours_worked, task_description, notes, photos, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          {
            replacements: [
              intern.id,
              dateStr,
              dateStr,
              total_hours,
              tasks_accomplished,
              skills_enhanced || '',
              photo_paths ? photo_paths.join(',') : null,
              'Pending'
            ]
          }
        );
        
        // Return a mock log object matching expected format
        log = {
          id: createdLog,
          intern_id: intern.id,
          log_date: dateStr,
          time_in,
          time_out,
          total_hours,
          tasks_accomplished,
          skills_enhanced: skills_enhanced || null,
          learning_applied: learning_applied || null,
          photo_path: photo_paths,
          supervisor_status: 'Pending',
          adviser_status: 'Pending',
        };
      } else {
        throw err;
      }
    }

    console.log('✅ Daily log created successfully');
    console.log('   ID:', log.id);
    console.log('   Day:', log.day_no);
    console.log('   Photos:', photo_paths ? photo_paths.length : 0);
    console.log('');

    return res.status(201).json(log);
  } catch (err) {
    console.error('❌ CREATE DAILY LOG ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({ message: 'Failed to create daily log' });
  }
};

exports.getDailyLogs = async (req, res) => {
  try {
    const { InternDailyLog, Intern } = getModels();

    console.log('\n=== GET DAILY LOGS (INTERN) ===');
    console.log('User ID:', req.user.id);

    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      console.error('❌ Intern not found');
      return res.status(404).json({ message: 'Intern not found' });
    }

    console.log('✅ Intern found - ID:', intern.id);

    const logs = await InternDailyLog.findAll({
      where: { intern_id: intern.id },
      order: [['log_date', 'DESC']],
    }).catch(async (err) => {
      // If new columns don't exist yet, use raw query mapping old columns to new ones
      if (err.message.includes("Unknown column")) {
        console.warn('⚠️ Column not found, using legacy schema fallback query');
        const sequelize = require('../config/database');
        const { QueryTypes } = require('sequelize');
        const rawLogs = await sequelize.query(
          `SELECT 
            id, 
            intern_id, 
            COALESCE(logDate, DATE(date), CURDATE()) as log_date,
            '08:00:00' as time_in,
            TIME(DATE_ADD(CONCAT(CURDATE(), ' 08:00:00'), INTERVAL COALESCE(hours_worked, 8) HOUR)) as time_out,
            COALESCE(hours_worked, 0) as total_hours,
            COALESCE(task_description, '') as tasks_accomplished,
            COALESCE(notes, '') as skills_enhanced,
            NULL as learning_applied,
            JSON_ARRAY(NULLIF(photos, '')) as photo_path,
            COALESCE(status, 'Pending') as supervisor_status,
            'Pending' as adviser_status,
            COALESCE(approval_remarks, '') as supervisor_comment,
            NULL as adviser_comment,
            NULL as supervisor_approved_at,
            NULL as adviser_approved_at,
            createdAt,
            updatedAt
           FROM intern_daily_logs 
           WHERE intern_id = ?
           ORDER BY COALESCE(logDate, DATE(date), CURDATE()) DESC`,
          {
            replacements: [intern.id],
            type: QueryTypes.SELECT,
          }
        );
        return rawLogs;
      } else {
        throw err; // Re-throw if it's a different error
      }
    });

    // ✅ NORMALIZE photo paths (handle JSON string, old 'uploads/filename' format & convert to array)
    const normalizedLogs = logs.map((log) => {
      if (log.photo_path) {
        let pathData = log.photo_path;
        
        // If it's a JSON string, parse it first
        if (typeof pathData === 'string' && (pathData.startsWith('[') || pathData.startsWith('{'))) {
          try {
            pathData = JSON.parse(pathData);
            console.log(`   Parsed JSON string:`, pathData);
          } catch (e) {
            console.log(`   Failed to parse JSON, treating as string:`, pathData);
          }
        }
        
        // Now handle the data
        if (typeof pathData === 'string') {
          // Old format - single string path
          const cleanPath = pathData.startsWith('uploads/') 
            ? pathData.replace('uploads/', '')
            : pathData;
          log.photo_path = [cleanPath];
        } else if (Array.isArray(pathData)) {
          // Already an array - clean up each path
          log.photo_path = pathData.map(p => {
            if (typeof p === 'string') {
              return p.startsWith('uploads/') ? p.replace('uploads/', '') : p;
            }
            return p;
          });
        }
      }
      return log;
    });

    console.log('✅ Found', normalizedLogs.length, 'logs');
    console.log('');

    return res.json(normalizedLogs);
  } catch (err) {
    console.error('❌ GET DAILY LOGS ERROR:', err.message);
    console.error('❌ FULL ERROR STACK:', err);
    return res.status(500).json({ message: 'Failed to fetch daily logs', error: err.message });
  }
};

exports.getInternDailyLogsForAdviser = async (req, res) => {
  try {
    const { InternDailyLog } = getModels();
    const { id } = req.params;

    console.log('\n=== GET DAILY LOGS (ADVISER) ===');
      console.log('Requested intern_id (raw):', id);

      // Validate intern id param
      const internId = Number(id);
      if (!Number.isInteger(internId) || internId <= 0) {
        console.error('❌ Invalid intern id parameter:', id);
        return res.status(400).json({ message: 'Invalid intern id' });
      }

      /* =========================
         FETCH LOGS FOR SPECIFIC INTERN
      ========================= */
      const logs = await InternDailyLog.findAll({
        where: { intern_id: internId },
        order: [['log_date', 'DESC']],
      }).catch(async (err) => {
        // If new columns don't exist yet, use raw query mapping old columns to new ones
        if (err.message.includes("Unknown column")) {
          console.warn('⚠️ Column not found, using legacy schema fallback query');
          const sequelize = require('../config/database');
          const { QueryTypes } = require('sequelize');
          const rawLogs = await sequelize.query(
            `SELECT 
              id, 
              intern_id, 
              COALESCE(logDate, DATE(date), CURDATE()) as log_date,
              '08:00:00' as time_in,
              TIME(DATE_ADD(CONCAT(CURDATE(), ' 08:00:00'), INTERVAL COALESCE(hours_worked, 8) HOUR)) as time_out,
              COALESCE(hours_worked, 0) as total_hours,
              COALESCE(task_description, '') as tasks_accomplished,
              COALESCE(notes, '') as skills_enhanced,
              NULL as learning_applied,
              JSON_ARRAY(NULLIF(photos, '')) as photo_path,
              COALESCE(status, 'Pending') as supervisor_status,
              'Pending' as adviser_status,
              COALESCE(approval_remarks, '') as supervisor_comment,
              NULL as adviser_comment,
              NULL as supervisor_approved_at,
              NULL as adviser_approved_at,
              createdAt,
              updatedAt
             FROM intern_daily_logs 
             WHERE intern_id = ?
             ORDER BY COALESCE(logDate, DATE(date), CURDATE()) DESC`,
            {
              replacements: [internId],
              type: QueryTypes.SELECT,
            }
          );
          return rawLogs;
        } else {
          throw err; // Re-throw if it's a different error
        }
      });

      console.log('✅ Found', logs.length, 'logs for intern_id:', internId);

      // Normalize and safely transform each log to plain object
      const normalizedLogs = logs.map((instance) => {
        // Convert Sequelize instance to plain object to avoid accidental prototype issues
        const log = typeof instance.toJSON === 'function' ? instance.toJSON() : { ...instance };

        try {
          if (log.photo_path) {
            let pathData = log.photo_path;

            // If it's a JSON string, parse it first
            if (typeof pathData === 'string' && (pathData.startsWith('[') || pathData.startsWith('{'))) {
              try {
                pathData = JSON.parse(pathData);
                console.log(`   Parsed JSON string for log ${log.id}:`, pathData);
              } catch (e) {
                console.warn(`   Failed to parse photo_path for log ${log.id}, treating as raw string`);
              }
            }

            // Now normalize into an array of clean filenames or leave null on unexpected types
            if (typeof pathData === 'string') {
              const cleanPath = pathData.startsWith('uploads/') ? pathData.replace('uploads/', '') : pathData;
              log.photo_path = [cleanPath];
            } else if (Array.isArray(pathData)) {
              log.photo_path = pathData.map((p) => (typeof p === 'string' ? (p.startsWith('uploads/') ? p.replace('uploads/', '') : p) : p));
            } else {
              console.warn(`   Unexpected photo_path type for log ${log.id}:`, typeof pathData);
              log.photo_path = null;
            }
          }
        } catch (normalizeErr) {
          console.error(`   Error normalizing photo_path for log ${log.id}:`, normalizeErr);
          log.photo_path = null;
        }

        return log;
      });

      // Lightweight debug: first 5 photo_path values
      normalizedLogs.slice(0, 5).forEach((l, idx) => {
        console.log(`   Log[${idx}] id=${l.id} photo_path=`, l.photo_path || '(none)');
      });

      return res.json(normalizedLogs);
    } catch (err) {
      // Log full error for debugging
      console.error('❌ GET INTERN DAILY LOGS ERROR:', err);
      return res.status(500).json({ message: 'Failed to fetch daily logs', error: err.message });
    }
};

/* =========================
   APPROVE LOG BY ADVISER
========================= */
exports.approveLogByAdviser = async (req, res) => {
  try {
    const { InternDailyLog } = getModels();
    const { reportId } = req.params;
    const { adviser_status, adviser_comment } = req.body;

    console.log('\n=== APPROVE LOG (ADVISER) ===');
    console.log('Report ID:', reportId);
    console.log('Status:', adviser_status);

    /* =========================
       VALIDATION
    ========================= */
    if (!adviser_status) {
      console.error('❌ adviser_status is required');
      return res.status(400).json({ message: 'adviser_status is required' });
    }

    /* =========================
       FIND AND UPDATE LOG
    ========================= */
    const log = await InternDailyLog.findByPk(reportId);

    if (!log) {
      console.error('❌ Daily log not found - ID:', reportId);
      return res.status(404).json({ message: 'Daily log not found' });
    }

    /* =========================
       WORKFLOW VALIDATION: SUPERVISOR MUST APPROVE FIRST
    ========================= */
    if (adviser_status === 'Approved' && log.supervisor_status !== 'Approved') {
      console.error('❌ Cannot approve - supervisor must approve first');
      console.error('   Supervisor status:', log.supervisor_status);
      return res.status(400).json({ 
        message: 'Supervisor must approve this log before adviser approval',
        supervisor_status: log.supervisor_status 
      });
    }

    if (log.supervisor_status === 'Rejected') {
      console.error('❌ Cannot approve - supervisor has rejected this log');
      return res.status(400).json({ 
        message: 'Cannot approve - supervisor has rejected this log' 
      });
    }

    await log.update({
      adviser_status,
      adviser_comment: adviser_comment || null,
      adviser_approved_at: adviser_status === 'Approved' ? new Date() : null, // ✅ Set approval date
    });

    console.log('✅ Log approved successfully');
    console.log('   New status:', adviser_status);
    console.log('');

    return res.json({
      message: 'Log approved successfully',
      log,
    });
  } catch (err) {
    console.error('❌ APPROVE LOG ERROR:', err.message);
    return res.status(500).json({ message: 'Failed to approve log' });
  }
};

/* =========================
   GET COMPANY INTERN DAILY LOGS (SUPERVISOR)
========================= */
exports.getCompanyInternDailyLogs = async (req, res) => {
  try {
    const { InternDailyLog, Intern, Supervisor, Company } = getModels();
    const { internId } = req.params;

    console.log('\n=== GET COMPANY INTERN DAILY LOGS ===');
    console.log('Intern ID:', internId);
    console.log('Logged-in user ID:', req.user.id);
    console.log('User role:', req.user.role);

    /* =========================
       DETERMINE COMPANY ID
    ========================= */
    let companyId = null;

    // ✅ If user role is 'supervisor' (company users), req.user.id is the company ID
    if (req.user.role === 'supervisor') {
      companyId = req.user.id;
      console.log('✅ User is a supervisor/company - company_id:', companyId);
    } else {
      // Try to find supervisor record for other roles
      const supervisor = await Supervisor.findOne({
        where: {
          user_id: req.user.id,
        },
      });

      if (supervisor) {
        companyId = supervisor.company_id;
        console.log('✅ Supervisor record found - company_id:', companyId);
      }
    }

    if (!companyId) {
      console.error('❌ Unable to determine company ID for user:', req.user.id);
      return res.status(403).json({ message: 'Unauthorized - you are not authorized to view logs' });
    }

    /* =========================
       VERIFY INTERN BELONGS TO COMPANY
    ========================= */
    const intern = await Intern.findOne({
      where: {
        id: internId,
        company_id: companyId,
      },
    });

    if (!intern) {
      console.error('❌ Intern not found or does not belong to this company');
      console.error('   Intern ID:', internId);
      console.error('   Company ID:', companyId);
      return res.status(403).json({ message: 'Unauthorized access to intern logs' });
    }

    /* =========================
       FETCH LOGS
    ========================= */
    const logs = await InternDailyLog.findAll({
      where: { intern_id: internId },
      order: [['log_date', 'DESC']],
    }).catch(async (err) => {
      // If new columns don't exist yet, use raw query mapping old columns to new ones
      if (err.message.includes("Unknown column")) {
        console.warn('⚠️ Column not found, using legacy schema fallback query');
        const sequelize = require('../config/database');
        const { QueryTypes } = require('sequelize');
        const rawLogs = await sequelize.query(
          `SELECT 
            id, 
            intern_id, 
            COALESCE(logDate, DATE(date), CURDATE()) as log_date,
            '08:00:00' as time_in,
            TIME(DATE_ADD(CONCAT(CURDATE(), ' 08:00:00'), INTERVAL COALESCE(hours_worked, 8) HOUR)) as time_out,
            COALESCE(hours_worked, 0) as total_hours,
            COALESCE(task_description, '') as tasks_accomplished,
            COALESCE(notes, '') as skills_enhanced,
            NULL as learning_applied,
            JSON_ARRAY(NULLIF(photos, '')) as photo_path,
            COALESCE(status, 'Pending') as supervisor_status,
            'Pending' as adviser_status,
            COALESCE(approval_remarks, '') as supervisor_comment,
            NULL as adviser_comment,
            NULL as supervisor_approved_at,
            NULL as adviser_approved_at,
            createdAt,
            updatedAt
           FROM intern_daily_logs 
           WHERE intern_id = ?
           ORDER BY COALESCE(logDate, DATE(date), CURDATE()) DESC`,
          {
            replacements: [internId],
            type: QueryTypes.SELECT,
          }
        );
        return rawLogs;
      } else {
        throw err; // Re-throw if it's a different error
      }
    });

    console.log(`✅ Found ${logs.length} logs for intern`);

    // ✅ NORMALIZE photo paths (handle JSON string, old 'uploads/filename' format & convert to array)
    const normalizedLogs = logs.map((log) => {
      const logJSON = log.toJSON();
      
      if (logJSON.photo_path) {
        let pathData = logJSON.photo_path;
        
        // If it's a JSON string, parse it first
        if (typeof pathData === 'string' && (pathData.startsWith('[') || pathData.startsWith('{'))) {
          try {
            pathData = JSON.parse(pathData);
            console.log(`   Parsed JSON string:`, pathData);
          } catch (e) {
            console.log(`   Failed to parse JSON, treating as string:`, pathData);
          }
        }
        
        // Now handle the data
        if (typeof pathData === 'string') {
          // Old format - single string path
          const cleanPath = pathData.startsWith('uploads/') 
            ? pathData.replace('uploads/', '')
            : pathData;
          logJSON.photo_path = [cleanPath];
        } else if (Array.isArray(pathData)) {
          // Already an array - clean up each path
          logJSON.photo_path = pathData.map(p => {
            if (typeof p === 'string') {
              return p.startsWith('uploads/') ? p.replace('uploads/', '') : p;
            }
            return p;
          });
        }
      }
      
      return logJSON;
    });

    return res.json(normalizedLogs);
  } catch (err) {
    console.error('❌ GET COMPANY INTERN DAILY LOGS ERROR:', err.message);
    return res.status(500).json({ message: 'Failed to fetch daily logs' });
  }
};

/* =========================
   APPROVE LOG BY SUPERVISOR
========================= */
exports.approveLogBySupervisor = async (req, res) => {
  try {
    const { InternDailyLog, Intern, Supervisor } = getModels();
    const { reportId } = req.params;
    const { supervisor_status, supervisor_comment } = req.body;

    console.log('\n=== APPROVE LOG (SUPERVISOR) ===');
    console.log('Report ID:', reportId);
    console.log('Status:', supervisor_status);
    console.log('Logged-in user ID:', req.user.id);
    console.log('User role:', req.user.role);

    /* =========================
       VALIDATION
    ========================= */
    if (!supervisor_status) {
      console.error('❌ supervisor_status is required');
      return res.status(400).json({ message: 'supervisor_status is required' });
    }

    /* =========================
       FIND LOG AND VERIFY OWNERSHIP
    ========================= */
    const log = await InternDailyLog.findByPk(reportId, {
      include: [
        {
          model: Intern,
          as: 'Intern',
          attributes: ['company_id'],
        },
      ],
    });

    if (!log) {
      console.error('❌ Daily log not found - ID:', reportId);
      return res.status(404).json({ message: 'Daily log not found' });
    }

    /* =========================
       DETERMINE COMPANY ID & VERIFY AUTHORIZATION
    ========================= */
    let companyId = null;

    // ✅ If user role is 'supervisor' (company users), req.user.id is the company ID
    if (req.user.role === 'supervisor') {
      companyId = req.user.id;
      console.log('✅ User is a supervisor/company - company_id:', companyId);
    } else {
      // Try to find supervisor record
      const supervisor = await Supervisor.findOne({
        where: {
          user_id: req.user.id,
        },
      });

      if (supervisor) {
        companyId = supervisor.company_id;
        console.log('✅ Supervisor found - company_id:', companyId);
      }
    }

    // Check if the logged-in user's company matches the intern's company
    const internCompanyId = log.Intern.company_id;
    if (companyId !== internCompanyId) {
      console.error('❌ Unauthorized - intern does not belong to user\'s company');
      console.error('   Intern company_id:', internCompanyId);
      console.error('   User company_id:', companyId);
      return res.status(403).json({ message: 'Unauthorized access - you do not supervise this intern' });
    }

    console.log('✅ Authorization verified - supervisor belongs to company:', companyId);

    /* =========================
       UPDATE LOG
    ========================= */
    await log.update({
      supervisor_status,
      supervisor_comment: supervisor_comment || null,
      supervisor_approved_at: supervisor_status === 'Approved' ? new Date() : null, // ✅ Set approval date
    });

    console.log('✅ Log approved successfully by supervisor');
    console.log('   New status:', supervisor_status);

    return res.json({
      message: 'Log approved successfully',
      log,
    });
  } catch (err) {
    console.error('❌ APPROVE LOG BY SUPERVISOR ERROR:', err.message);
    return res.status(500).json({ message: 'Failed to approve log' });
  }
};

/* =========================
   UPDATE DAILY LOG
========================= */
exports.updateDailyLog = async (req, res) => {
  try {
    const { InternDailyLog, Intern } = getModels();
    const { id } = req.params;
    const { log_date, time_in, time_out, tasks_accomplished, skills_enhanced, learning_applied } = req.body;

    console.log('\n=== UPDATE DAILY LOG ===');
    console.log('📝 Log ID:', id);

    // Find intern
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Find log
    const log = await InternDailyLog.findOne({
      where: { id, intern_id: intern.id },
    });

    if (!log) {
      return res.status(404).json({ message: 'Daily log not found' });
    }

    // Update fields
    if (log_date) log.log_date = log_date;
    if (time_in) log.time_in = time_in;
    if (time_out) log.time_out = time_out;
    if (tasks_accomplished) log.tasks_accomplished = tasks_accomplished;
    if (skills_enhanced) log.skills_enhanced = skills_enhanced;
    if (learning_applied) log.learning_applied = learning_applied;

    // Handle photo update (multiple photos)
    if (req.files && req.files.length > 0) {
      // Delete old photos if they exist
      if (log.photo_path && Array.isArray(log.photo_path)) {
        const fs = require('fs');
        log.photo_path.forEach((filename) => {
          const oldPhotoPath = path.join(__dirname, '../uploads', filename);
          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        });
      }
      // Store new filenames
      log.photo_path = req.files.map(f => f.filename);
    }

    await log.save();

    console.log('✅ Log updated successfully');
    return res.json({
      message: 'Daily log updated successfully',
      log,
    });
  } catch (err) {
    console.error('❌ UPDATE DAILY LOG ERROR:', err.message);
    return res.status(500).json({ message: 'Failed to update daily log' });
  }
};

/* =========================
   DELETE DAILY LOG
========================= */
exports.deleteDailyLog = async (req, res) => {
  try {
    const { InternDailyLog, Intern } = getModels();
    const { id } = req.params;

    console.log('\n=== DELETE DAILY LOG ===');
    console.log('🗑️ Log ID:', id);

    // Find intern
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Find log
    const log = await InternDailyLog.findOne({
      where: { id, intern_id: intern.id },
    });

    if (!log) {
      return res.status(404).json({ message: 'Daily log not found' });
    }

    // Delete photo files if they exist
    if (log.photo_path && Array.isArray(log.photo_path)) {
      const fs = require('fs');
      log.photo_path.forEach((filename) => {
        const photoPath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
          console.log('🗑️ Deleted photo:', filename);
        }
      });
    }

    await log.destroy();

    console.log('✅ Log deleted successfully');
    return res.json({
      message: 'Daily log deleted successfully',
    });
  } catch (err) {
    console.error('❌ DELETE DAILY LOG ERROR:', err.message);
    return res.status(500).json({ message: 'Failed to delete daily log' });
  }
};

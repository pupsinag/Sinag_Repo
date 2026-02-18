/* eslint-env node */
const express = require('express');
const router = express.Router();
const { User, Intern } = require('../models');

/**
 * DIAGNOSTIC ENDPOINT - Check if intern records exist
 * GET /api/diagnostic/check-interns
 * 
 * This endpoint checks if all Users with role='Intern' have corresponding Intern records
 */
router.get('/check-interns', async (req, res) => {
  try {
    // Find all interns (Users with role='Intern')
    const users = await User.findAll({
      where: { role: 'Intern' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'studentId'],
      raw: true,
    });

    // Check which ones have Intern records
    const results = [];
    for (const user of users) {
      const internRecord = await Intern.findOne({
        where: { user_id: user.id },
        attributes: ['id'],
        raw: true,
      });

      results.push({
        user_id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        studentId: user.studentId,
        has_intern_record: !!internRecord,
        intern_id: internRecord?.id || null,
      });
    }

    const missing = results.filter(r => !r.has_intern_record);

    return res.json({
      total_interns: users.length,
      with_records: results.filter(r => r.has_intern_record).length,
      missing_records: missing.length,
      details: results,
      missing_details: missing,
    });
  } catch (err) {
    console.error('❌ DIAGNOSTIC ERROR:', err);
    return res.status(500).json({ message: 'Diagnostic failed', error: err.message });
  }
});

/**
 * FIX MISSING INTERN RECORDS
 * POST /api/diagnostic/fix-missing-interns
 * 
 * This endpoint creates missing Intern records for Users with role='Intern'
 */
router.post('/fix-missing-interns', async (req, res) => {
  try {
    // Find all interns without records
    const users = await User.findAll({
      where: { role: 'Intern' },
      attributes: ['id', 'program', 'yearSection'],
      raw: true,
    });

    let fixed = 0;
    const errors = [];

    for (const user of users) {
      const exists = await Intern.findOne({
        where: { user_id: user.id },
      });

      if (!exists) {
        try {
          await Intern.create({
            user_id: user.id,
            program: user.program || 'Unknown',
            year_section: user.yearSection || null,
            status: 'Pending',
          });
          fixed++;
        } catch (err) {
          errors.push({
            user_id: user.id,
            error: err.message,
          });
        }
      }
    }

    return res.json({
      message: `Fixed ${fixed} missing intern records`,
      fixed,
      errors,
    });
  } catch (err) {
    console.error('❌ FIX ERROR:', err);
    return res.status(500).json({ message: 'Fix failed', error: err.message });
  }
});

module.exports = router;

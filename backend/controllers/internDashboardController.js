/* eslint-env node */
'use strict';

const { User, Intern, Company, InternDocuments } = require('../models');

exports.getInternDashboard = async (req, res) => {
  try {
    /* =========================
       AUTH VALIDATION
    ========================= */
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;

    const user = await User.findByPk(userId, {
      attributes: ['firstName', 'lastName', 'mi', 'studentId'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User record not found' });
    }

    /* =========================
       FETCH INTERN (PRIMARY)
    ========================= */
    let intern = null;
    try {
      intern = await Intern.findOne({
        where: { user_id: userId },
      });
    } catch (err) {
      console.error('❌ INTERN LOOKUP ERROR:', err.message);
    }

    /* =========================
       VALIDATION
    ========================= */
    if (!intern) {
      return res.json({
        firstName: user.firstName,
        fullName: `${user.lastName}, ${user.firstName}${user.mi ? ` ${user.mi}` : ''}`,
        studentId: user.studentId,
        status: 'Pending',
        remarks: null,
        documents: [
          { name: 'Consent Form', uploaded: false, file: null },
          { name: 'Notarized Agreement', uploaded: false, file: null },
          { name: 'MOA', uploaded: false, file: null },
          { name: 'Resume', uploaded: false, file: null },
          { name: 'COR', uploaded: false, file: null },
          { name: 'Insurance', uploaded: false, file: null },
          { name: 'Medical Certificate', uploaded: false, file: null },
        ],
        companyDetails: null,
        setupRequired: true,
      });
    }

    let docs = {};
    let company = null;
    if (intern) {
      try {
        docs = await InternDocuments.findOne({ where: { intern_id: intern.id } }) || {};
      } catch (err) {
        console.error('❌ INTERN DOCS LOOKUP ERROR:', err.message);
      }

      if (intern.company_id) {
        try {
          company = await Company.findByPk(intern.company_id, {
            attributes: ['name', 'supervisorName', 'moaStart', 'moaEnd', 'moaFile'],
          });
        } catch (err) {
          console.error('❌ COMPANY LOOKUP ERROR:', err.message);
        }
      }
    }

    /* =========================
       RESPONSE
    ========================= */
    return res.json({
      firstName: user.firstName,
      fullName: `${user.lastName}, ${user.firstName}${user.mi ? ` ${user.mi}` : ''}`,
      studentId: user.studentId,

      status: intern.status,
      remarks: intern.remarks || null,

      documents: [
        { name: 'Consent Form', uploaded: !!docs.consent_form, file: docs.consent_form ?? null },
        { name: 'Notarized Agreement', uploaded: !!docs.notarized_agreement, file: docs.notarized_agreement ?? null },
        { name: 'MOA', uploaded: !!company?.moaFile, file: company?.moaFile ?? null },
        { name: 'Resume', uploaded: !!docs.resume, file: docs.resume ?? null },
        { name: 'COR', uploaded: !!docs.cor, file: docs.cor ?? null },
        { name: 'Insurance', uploaded: !!docs.insurance, file: docs.insurance ?? null },
        { name: 'Medical Certificate', uploaded: !!docs.medical_cert, file: docs.medical_cert ?? null },
      ],

      companyDetails: company
        ? {
            companyName: company.name,
            supervisor: company.supervisorName,
            startDate: company.moaStart,
            endDate: company.moaEnd,
          }
        : null,
    });
  } catch (error) {
    console.error('❌ INTERN DASHBOARD ERROR (STACK):', error);

    return res.status(500).json({
      message: 'Failed to load intern dashboard',
      error: error.message, // ✅ expose exact Sequelize error
    });
  }
};

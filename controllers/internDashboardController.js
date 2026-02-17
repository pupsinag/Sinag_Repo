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

    /* =========================
       FETCH INTERN + RELATIONS
    ========================= */
    const intern = await Intern.findOne({
      where: { user_id: userId },

      include: [
        {
          model: User,
          as: 'User',
          required: true,
          attributes: ['firstName', 'lastName', 'mi', 'studentId'],
        },
        {
          model: Company,
          as: 'company',
          required: false,
          attributes: ['name', 'supervisorName', 'moaStart', 'moaEnd', 'moaFile'],
        },
        {
          model: InternDocuments,
          as: 'InternDocuments',
          required: false,
        },
      ],
    });

    /* =========================
       VALIDATION
    ========================= */
    if (!intern) {
      return res.status(404).json({ message: 'Intern record not found' });
    }

    const docs = intern.InternDocuments || {};

    /* =========================
       RESPONSE
    ========================= */
    return res.json({
      firstName: intern.User.firstName,
      fullName: `${intern.User.lastName}, ${intern.User.firstName}${intern.User.mi ? ` ${intern.User.mi}` : ''}`,
      studentId: intern.User.studentId,

      status: intern.status,
      remarks: intern.remarks || null,

      documents: [
        { name: 'Consent Form', uploaded: !!docs.consent_form, file: docs.consent_form ?? null },
        { name: 'Notarized Agreement', uploaded: !!docs.notarized_agreement, file: docs.notarized_agreement ?? null },
        { name: 'MOA', uploaded: !!intern.company?.moaFile, file: intern.company?.moaFile ?? null },
        { name: 'Resume', uploaded: !!docs.resume, file: docs.resume ?? null },
        { name: 'COR', uploaded: !!docs.cor, file: docs.cor ?? null },
        { name: 'Insurance', uploaded: !!docs.insurance, file: docs.insurance ?? null },
        { name: 'Medical Certificate', uploaded: !!docs.medical_cert, file: docs.medical_cert ?? null },
      ],

      companyDetails: intern.company
        ? {
            companyName: intern.company.name,
            supervisor: intern.company.supervisorName,
            startDate: intern.company.moaStart,
            endDate: intern.company.moaEnd,
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

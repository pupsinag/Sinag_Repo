/* eslint-env node */
const db = require('../models');

const Intern = db.Intern;
const User = db.User;
const Company = db.Company;
const generateConsentPDF = require('../utils/generateConsentPDF');

/* =========================
   GET CONSENT DATA
========================= */
exports.getConsentData = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log('🔍 Getting consent data for user:', userId);

    // Get intern with all necessary associations
    const intern = await Intern.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['firstName', 'lastName', 'guardian', 'program'],
        },
        {
          model: Company,
          as: 'company',
          attributes: ['name', 'address', 'supervisorName'],
        },
      ],
    });

    console.log('📋 Intern found:', intern?.id, 'Company:', intern?.company?.id);

    if (!intern) {
      console.warn('⚠️ No intern record for user:', userId);
      return res.status(404).json({ message: 'Intern record not found.' });
    }

    if (!intern.company || !intern.company.id) {
      console.warn('⚠️ No HTE assigned for intern:', intern.id);
      return res.status(400).json({ message: 'HTE not yet assigned.' });
    }

    if (!intern.User) {
      console.warn('⚠️ No user data for intern:', intern.id);
      return res.status(400).json({ message: 'User data missing.' });
    }

    const response = {
      studentName: `${intern.User.firstName || ''} ${intern.User.lastName || ''}`.trim(),
      guardian: intern.User.guardian || '',
      program: intern.User.program || '',
      hteName: intern.company.name || '',
      hteAddress: intern.company.address || '',
      supervisorName: intern.company.supervisorName || '',
      startDate: intern.start_date || '',
      endDate: intern.end_date || '',
      hours: intern.required_hours || '',
    };

    console.log('✅ Consent data response:', response);
    res.json(response);
  } catch (err) {
    console.error('❌ getConsentData error:', err.message);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

/* =========================
   SAVE CONSENT
========================= */
exports.saveConsent = async (req, res) => {
  try {
    const { guardianName, hours, endDate } = req.body;

    if (!guardianName || !hours || !endDate) {
      return res.status(400).json({
        message: 'Guardian name, required hours, and end date are required.',
      });
    }

    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'User' },
        { model: Company, as: 'company' },
      ],
    });

    if (!intern || !intern.company || !intern.User) {
      return res.status(400).json({
        message: 'Consent data incomplete.',
      });
    }

    await intern.update({
      end_date: endDate,
      required_hours: hours,
    });

    await intern.User.update({
      guardian: guardianName,
    });

    const filename = `CONSENT_${intern.id}_${Date.now()}.pdf`;

    await generateConsentPDF(
      {
        studentName: `${intern.User.firstName} ${intern.User.lastName}`,
        guardian: guardianName,
        program: intern.User.program,
        hteName: intern.company.name,
        hteAddress: intern.company.address,
        startDate: intern.start_date,
        endDate,
        hours,
      },
      filename,
    );

    res.json({ fileUrl: `/uploads/${filename}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const db = require('../models');

const Intern = db.Intern;
const User = db.User;
const Company = db.Company;
const generateAgreementPDF = require('../utils/generateNotarizedAgreementPDF');

/* =========================
   GET AGREEMENT DATA
========================= */
exports.getAgreementData = async (req, res) => {
  try {
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'User', attributes: ['firstName', 'lastName', 'guardian', 'program'] },
        { model: Company, as: 'company', attributes: ['name', 'address', 'supervisorName'] },
      ],
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    res.json({
      studentName: `${intern.User.firstName} ${intern.User.lastName}`,
      guardian: intern.User.guardian,
      program: intern.User.program,
      startDate: intern.start_date,
      hteName: intern.company?.name || '',
      hteAddress: intern.company?.address || '',
      authorizedRep: intern.company?.supervisorName || '',
      hours: intern.required_hours || '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =========================
   SAVE & GENERATE PDF
========================= */
exports.saveAgreement = async (req, res) => {
  try {
    const { guardianName, hours, endDate } = req.body;

    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'User' },
        { model: Company, as: 'company' },
      ],
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // 🔐 SAVE EDITABLE FIELDS
    await intern.User.update({ guardian: guardianName });
    await intern.update({
      required_hours: hours,
      end_date: endDate,
    });

    const fileUrl = await generateAgreementPDF({
      studentName: `${intern.User.firstName} ${intern.User.lastName}`,
      guardian: guardianName,
      program: intern.User.program,
      startDate: intern.start_date,
      endDate,
      hours,
      hteName: intern.company?.name || '',
      hteAddress: intern.company?.address || '',
      authorizedRep: intern.company?.supervisorName || '',
    });

    res.json({ fileUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

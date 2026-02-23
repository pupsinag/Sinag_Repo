const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');
const internDashboardController = require('../controllers/internDashboardController');
const internController = require('../controllers/internController'); // ✅ ADD
const companyDashboardController = require('../controllers/companyDashboardController');

// 🔐 Protect ALL dashboard routes
router.use(authMiddleware(['superadmin', 'coordinator', 'adviser', 'intern', 'company']));

// 👨‍🎓 INTERN DASHBOARD
router.get('/intern', internDashboardController.getInternDashboard);

// 👨‍🏫 ADVISER – INTERN TABLE (🔥 THIS FIXES YOUR ERROR)
router.get('/adviser-interns', authMiddleware(['adviser', 'coordinator']), internController.getInternsForAdviser);

// 📊 SHARED DASHBOARD DATA
router.get('/programs', dashboardController.getPrograms);
router.get('/companies', dashboardController.getCompanies);
router.get('/kpis', dashboardController.getKpis);
router.get('/adviser-programs', async (req, res) => {
  try {
    // Get all unique programs from users table (role: Adviser, case-insensitive)
    const { User } = require('../models');
    const Sequelize = require('sequelize');
    const programs = await User.findAll({
      where: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('role')), Sequelize.Op.eq, 'adviser'),
      attributes: ['program'],
      group: ['program'],
      raw: true,
    });
    // Return all non-null, unique programs
    res.json(programs.map((p) => p.program).filter(Boolean));
  } catch (err) {
    console.error('❌ /adviser-programs error:', err);
    res.status(500).json({ message: 'Failed to fetch programs' });
  }
});

// New endpoint: Get all unique year_section for a given program from Interns table
router.get('/year-sections', dashboardController.getYearSectionsForProgram);

// 👨‍🏫 ADVISER KPI (cards)
router.get('/adviser-kpis', authMiddleware(['adviser']), dashboardController.getAdviserKpis);

// 🏢 COMPANY - DAILY ATTENDANCE REPORT
router.get('/daily-attendance', authMiddleware(['company']), companyDashboardController.generateDailyAttendance);

// 🏢 COMPANY - GENERAL RECORD
router.get('/general-record', authMiddleware(['company']), companyDashboardController.generateGeneralRecord);

// Add this route for deleting interns (adviser/coordinator only)
router.delete('/interns/:id', authMiddleware(['adviser', 'coordinator', 'superadmin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { Intern, User } = require('../models');
    const intern = await Intern.findByPk(id);

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // If adviser, only allow delete if program and year_section match
    if (req.user.role === 'adviser') {
      const adviserProgram = req.user.program ? req.user.program.trim().toUpperCase() : '';
      const adviserYearSection = req.user.year_section ? req.user.year_section.trim().toUpperCase() : '';
      const internProgram = intern.program ? intern.program.trim().toUpperCase() : '';
      const internYearSection = intern.year_section ? intern.year_section.trim().toUpperCase() : '';
      if (adviserProgram !== internProgram || adviserYearSection !== internYearSection) {
        return res.status(403).json({ message: 'Forbidden: Program or Year/Section mismatch' });
      }
    }

    // Also delete the associated user record
    const user = await User.findByPk(intern.user_id);
    await intern.destroy();
    if (user) {
      await user.destroy();
    }

    res.json({ message: 'Intern and user deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

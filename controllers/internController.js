const { Intern, Company, User, InternDocuments } = require('../models');

const PROGRAM_MAP = {
  'BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY MAJOR': 'BSIT',
  'BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION MAJOR': 'BSBAHRM',
};

function getProgramCode(program) {
  const normalized = program.toUpperCase().replace(/[\s\-]/g, '');
  if (normalized.startsWith('BACHELOROFSCIENCEININFORMATIONTECHNOLOGY')) return 'BSIT';
  if (normalized.startsWith('BACHELOROFSCIENCEINBUSINESSADMINISTRATION')) return 'BSBAHRM';
  return null;
}

/* =================================================
   ASSIGN SUPERVISOR TO INTERN
================================================= */
exports.assignSupervisor = async (req, res, next) => {
  try {
    const { intern_id, supervisor_id } = req.body;

    if (!intern_id || !supervisor_id) {
      return res.status(400).json({ message: 'intern_id and supervisor_id are required' });
    }

    const intern = await Intern.findByPk(intern_id);
    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    // Update intern with supervisor_id
    await intern.update({ supervisor_id });

    res.json({
      message: 'Supervisor assigned successfully',
      intern,
    });
  } catch (err) {
    console.error('❌ ASSIGN SUPERVISOR ERROR:', err);
    next(err);
  }
};

/* =================================================
   INTERN – GET MY COMPANY
================================================= */
exports.getMyCompany = async (req, res) => {
  try {
    const userId = req.user.id;

    const intern = await Intern.findOne({
      where: { user_id: userId },
      include: {
        model: Company,
        attributes: ['id', 'name', 'address', 'natureOfBusiness'],
      },
    });

    if (!intern || !intern.Company) {
      return res.status(404).json({
        message: 'No company assigned to this intern',
      });
    }

    res.json(intern.Company);
  } catch (err) {
    console.error('❌ GET MY COMPANY ERROR:', err);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

/* =================================================
   ADVISER / COORDINATOR – GET INTERNS FOR TABLE
================================================= */
exports.getInternsForAdviser = async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    console.log('[getInternsForAdviser] User role:', userRole, 'User ID:', req.user.id);

    let whereCondition = {};

    // 🟢 COORDINATOR/SUPERADMIN: see ALL interns
    if (userRole === 'coordinator' || userRole === 'superadmin') {
      console.log('[getInternsForAdviser] Fetching ALL interns (coordinator/admin)');
      whereCondition = {};
    }
    // 🟢 ADVISER: see only their interns
    else if (userRole === 'adviser') {
      console.log('[getInternsForAdviser] Fetching interns for adviser:', req.user.id);
      whereCondition = { adviser_id: req.user.id };
    }

    console.log('[getInternsForAdviser] Where condition:', whereCondition);

    // Step 1: Get basic interns first
    const interns = await Intern.findAll({
      where: whereCondition,
      raw: true,
    });

    console.log('[getInternsForAdviser] Found', interns.length, 'interns (basic query)');

    // Step 2: Get User data for each intern
    const internIds = interns.map((i) => i.user_id);
    const users = {};
    if (internIds.length > 0) {
      const userData = await User.findAll({
        where: { id: internIds },
        attributes: ['id', 'studentId', 'lastName', 'firstName', 'mi', 'email', 'program'],
        raw: true,
      });
      userData.forEach((u) => {
        users[u.id] = u;
      });
    }

    // Step 3: Get Company data for each intern
    const companyIds = interns.map((i) => i.company_id).filter(Boolean);
    const companies = {};
    if (companyIds.length > 0) {
      const companyData = await Company.findAll({
        where: { id: companyIds },
        attributes: ['id', 'name', 'email', 'address', 'supervisorName', 'natureOfBusiness'],
        raw: true,
      });
      companyData.forEach((c) => {
        companies[c.id] = c;
      });
    }

    // Step 4: Enrich interns with User and Company data
    const enrichedInterns = interns.map((intern) => ({
      ...intern,
      User: users[intern.user_id] || null,
      company: intern.company_id ? companies[intern.company_id] || null : null,
    }));

    console.log('[getInternsForAdviser] Returning', enrichedInterns.length, 'enriched interns');
    res.json(enrichedInterns);
  } catch (err) {
    console.error('❌ GET INTERNS FOR ADVISER ERROR:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Failed to fetch interns', error: err.message });
  }
};

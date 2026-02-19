'use strict';

// ✅ LAZY LOAD - Require models inside functions to avoid circular dependency
function getModels() {
  return require('../models');
}

exports.getInterns = async (req, res, next) => {
  try {
    const { Intern, User, Company } = getModels();
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    console.log('[getInterns] User role:', userRole, 'User ID:', req.user.id);

    let where = {};

    // 🟢 COORDINATOR/SUPERADMIN: show ALL interns
    if (userRole === 'coordinator' || userRole === 'superadmin') {
      console.log('[getInterns] Mode: Coordinator/Admin - Showing ALL interns');
      where = {};
    }
    // 🟢 ADVISER: filter by their program (existing logic)
    else if (userRole === 'adviser') {
      console.log('[getInterns] Mode: Adviser - Filtering by program');
      const program = req.query.program || req.user?.program;
      const year_section = req.query.year_section || req.user?.yearSection || req.user?.year_section;

      // Build where clause if both are present
      if (program && year_section) {
        where = { program, year_section };
      } else if (program) {
        where = { program };
      }
    }

    console.log('[getInterns] Query where:', JSON.stringify(where));

    const interns = await Intern.findAll({
      where,
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'firstName', 'lastName', 'mi', 'email', 'studentId', 'program', 'yearSection'],
        },
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'email', 'supervisorName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    console.log('[getInterns] Found', interns.length, 'interns');
    return res.json(interns);
  } catch (err) {
    console.error('❌ GET INTERNS ERROR:', err.message);
    console.error('Stack:', err.stack);
    return res.status(500).json({ message: 'Failed to fetch interns', error: err.message });
  }
};

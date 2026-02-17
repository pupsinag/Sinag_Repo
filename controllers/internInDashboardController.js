'use strict';

// ✅ LAZY LOAD - Require models inside functions to avoid circular dependency
function getModels() {
  return require('../models');
}

exports.getInterns = async (req, res, next) => {
  try {
    const { Intern, User, Company } = getModels();

    // Get filter values from query or user (adviser)
    const program = req.query.program || req.user?.program;
    const year_section = req.query.year_section || req.user?.yearSection || req.user?.year_section;

    // Build where clause if both are present
    let where = {};
    if (program && year_section) {
      where = { program, year_section };
    } else if (program) {
      where = { program };
    }

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
      order: [['created_at', 'DESC']],
    });

    return res.json(interns);
  } catch (err) {
    console.error('❌ GET INTERNS ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch interns' });
  }
};

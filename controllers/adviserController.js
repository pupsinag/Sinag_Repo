/* eslint-env node */
const { Intern, User } = require('../models');
const { Op } = require('sequelize');

// ADVISER – GET INTERNS MATCHING PROGRAM AND YEARSECTION
exports.getMatchingInterns = async (req, res) => {
  try {
    const { program, yearSection } = req.user;
    console.log('--- [getMatchingInterns] Adviser program:', program);
    console.log('--- [getMatchingInterns] Adviser yearSection:', yearSection);
    if (!program) {
      console.log('--- [getMatchingInterns] Adviser missing program');
      return res.status(400).json({ message: 'Program missing from user profile.' });
    }

    const models = require('../models');
    const { Op, fn, col, where } = require('sequelize');
    const whereCondition = { program };

    // If adviser has a yearSection, filter by it; otherwise, return all interns in their program
    if (yearSection) {
      whereCondition[Op.and] = [
        where(
          fn('REPLACE', fn('LOWER', col('year_section')), ' ', ''),
          fn('REPLACE', fn('LOWER', yearSection), ' ', ''),
        ),
      ];
      console.log('--- [getMatchingInterns] Filtering by yearSection:', yearSection);
    } else {
      console.log('--- [getMatchingInterns] No yearSection - returning all interns for program');
    }

    const interns = await models.Intern.findAll({
      where: whereCondition,
      include: [
        { model: models.User, as: 'User' },
        { model: models.Company, as: 'company' },
        { model: models.InternDocuments, as: 'InternDocuments' },
        { model: models.Supervisor, as: 'Supervisor' },
      ],
      raw: false, // Important: keep as objects to use toJSON()
    });
    
    console.log(`--- [getMatchingInterns] Found ${interns.length} interns`);
    
    // Transform InternDocuments array into object structure for frontend
    const transformedInterns = interns.map((intern) => {
      const internData = intern.toJSON ? intern.toJSON() : intern;
      
      // Log documents for debugging
      console.log(`--- [getMatchingInterns] Intern ${internData.id} has ${Array.isArray(internData.InternDocuments) ? internData.InternDocuments.length : 0} documents`);
      
      // Aggregate all documents into a single object with document_type as key
      const aggregatedDocs = {};
      if (Array.isArray(internData.InternDocuments)) {
        internData.InternDocuments.forEach((doc) => {
          const docType = (doc.document_type || '').toLowerCase();
          aggregatedDocs[docType] = doc.file_path || null;
          console.log(`  - Document: ${docType} -> ${doc.file_path}`);
        });
      }
      
      // Return as array with single element (matching frontend expectation: InternDocuments[0])
      return {
        ...internData,
        InternDocuments: [aggregatedDocs], // Wrap in array for frontend
      };
    });
    
    console.log('--- [getMatchingInterns] Returning transformed interns');
    return res.json(transformedInterns);
  } catch (err) {
    console.error('❌ Error fetching matching interns:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* =================================================
   INTERN – GET ASSIGNED ADVISER
================================================= */
exports.getAdviserForStudent = async (req, res) => {
  try {
    // 1️⃣ Find intern record
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      return res.status(404).json({
        message: 'Intern record not found',
      });
    }

    // 2️⃣ Find adviser by role + program
    const adviser = await User.findOne({
      where: {
        role: 'adviser', // ✅ normalized role
        program: intern.program,
      },
    });

    if (!adviser) {
      return res.status(404).json({
        message: 'No adviser found for this program',
      });
    }

    // 3️⃣ Return adviser
    return res.json({
      adviserName: `${adviser.firstName} ${adviser.lastName}`,
    });
  } catch (err) {
    console.error('❌ Adviser fetch error:', err);
    return res.status(500).json({
      message: 'Server error',
    });
  }
};

/* =================================================
   ADVISER / COORDINATOR – GET PROGRAMS
================================================= */
exports.getProgramsForAdviser = async (req, res) => {
  try {
    const { role, id } = req.user;

    // 🟢 COORDINATOR: see ALL programs
    if (role === 'coordinator') {
      const programs = await User.findAll({
        where: {
          role: 'adviser',
          program: { [Op.not]: null },
        },
        attributes: ['program'],
        group: ['program'],
        order: [['program', 'ASC']],
      });

      return res.json(programs.map((p) => p.program));
    }

    // 🟡 ADVISER: see OWN program only
    if (role === 'adviser') {
      const adviser = await User.findByPk(id, {
        attributes: ['program'],
      });

      if (!adviser || !adviser.program) {
        return res.json([]);
      }

      return res.json([adviser.program]);
    }

    // 🔴 Others: no access
    return res.status(403).json({ message: 'Not allowed' });
  } catch (err) {
    console.error('❌ Program fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/* =================================================
   COORDINATOR – UPDATE ADVISER
================================================= */
exports.updateAdviser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, mi, program, yearSection } = req.body;

    // Check if adviser exists
    const adviser = await User.findByPk(id);
    if (!adviser) {
      return res.status(404).json({ message: 'Adviser not found' });
    }

    // Only coordinators can update advisers
    if (req.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Not authorized to update adviser' });
    }

    // Update adviser details
    await adviser.update({
      firstName: firstName || adviser.firstName,
      lastName: lastName || adviser.lastName,
      mi: mi !== undefined ? mi : adviser.mi,
      program: program || adviser.program,
      yearSection: yearSection || adviser.yearSection,
    });

    return res.json({
      message: 'Adviser updated successfully',
      adviser,
    });
  } catch (err) {
    console.error('❌ Error updating adviser:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

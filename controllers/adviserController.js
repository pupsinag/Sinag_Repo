// ADVISER – GET INTERNS MATCHING PROGRAM AND YEARSECTION
exports.getMatchingInterns = async (req, res) => {
  try {
    console.log('\n=== [getMatchingInterns] START ===');
    const { program, yearSection } = req.user;
    console.log('[getMatchingInterns] req.user:', { id: req.user.id, program, yearSection });
    
    if (!program) {
      console.log('[getMatchingInterns] ❌ Adviser missing program');
      return res.status(400).json({ message: 'Program missing from user profile.' });
    }

    // Step 1: Fetch interns for program
    console.log('[getMatchingInterns] Step 1️⃣ : Querying interns for program:', program);
    
    const Intern = require('../models').Intern;
    const User = require('../models').User;
    const Company = require('../models').Company;
    const InternDocuments = require('../models').InternDocuments;
    const Supervisor = require('../models').Supervisor;
    
    console.log('[getMatchingInterns] Models loaded:', { 
      Intern: !!Intern, 
      User: !!User, 
      Company: !!Company,
      InternDocuments: !!InternDocuments,
      Supervisor: !!Supervisor
    });

    let interns;
    try {
      interns = await Intern.findAll({
        where: { program },
        include: [
          { 
            model: User, 
            as: 'User',
            required: false 
          },
          { 
            model: Company, 
            as: 'company',
            required: false 
          },
          { 
            model: InternDocuments, 
            as: 'InternDocuments',
            attributes: { exclude: ['file_content'] },
            required: false
          },
          { 
            model: Supervisor, 
            as: 'Supervisor',
            required: false 
          },
        ],
      });
      console.log('[getMatchingInterns] Step 1️⃣ COMPLETE: Found', interns.length, 'interns for program:', program);
    } catch (dbErr) {
      console.error('[getMatchingInterns] ❌ Database query error:', dbErr.message);
      console.error('[getMatchingInterns] Stack:', dbErr.stack);
      return res.status(500).json({ 
        message: 'Database query failed',
        error: process.env.NODE_ENV === 'development' ? dbErr.message : undefined
      });
    }

    // Step 2: Filter by yearSection in JavaScript
    console.log('[getMatchingInterns] Step 2️⃣ : Filtering by yearSection');
    let filteredInterns = interns;
    if (yearSection) {
      const normalizedAdviserYearSection = (yearSection || '').replace(/\s/g, '').toLowerCase();
      console.log('[getMatchingInterns] Adviser yearSection normalized:', normalizedAdviserYearSection);
      
      filteredInterns = interns.filter(intern => {
        const normalizedInternYearSection = (intern.year_section || '').replace(/\s/g, '').toLowerCase();
        const matches = normalizedAdviserYearSection === normalizedInternYearSection;
        if (!matches) {
          console.log('[getMatchingInterns] Intern', intern.id, 'year_section does not match:',
            'intern:', intern.year_section, '→', normalizedInternYearSection,
            'adviser:', yearSection, '→', normalizedAdviserYearSection);
        }
        return matches;
      });
      console.log('[getMatchingInterns] Step 2️⃣ COMPLETE: Filtered from', interns.length, 'to', filteredInterns.length, 'interns');
    } else {
      console.log('[getMatchingInterns] Step 2️⃣ : No yearSection filter, using all', interns.length, 'interns');
    }

    // Step 3: Transform documents
    console.log('[getMatchingInterns] Step 3️⃣ : Transforming intern data');
    const transformedInterns = filteredInterns.map((intern) => {
      const internData = intern.toJSON ? intern.toJSON() : intern;
      
      // Aggregate all documents into a single object with document_type as key
      const aggregatedDocs = {};
      if (Array.isArray(internData.InternDocuments)) {
        internData.InternDocuments.forEach((doc) => {
          const docType = (doc.document_type || '').toLowerCase();
          aggregatedDocs[docType] = doc.file_path || null;
        });
      }
      
      return {
        ...internData,
        InternDocuments: [aggregatedDocs],
      };
    });

    console.log('[getMatchingInterns] Step 3️⃣ COMPLETE: Transformed', transformedInterns.length, 'interns');
    console.log('[getMatchingInterns] ✅ SUCCESS - returning data');
    console.log('=== [getMatchingInterns] END ===\n');
    
    return res.json(transformedInterns);
  } catch (err) {
    console.error('\n❌ [getMatchingInterns] CRITICAL ERROR:', err.message);
    console.error('[getMatchingInterns] Stack:', err.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
};
const { Intern, User } = require('../models');
const { Op } = require('sequelize');

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

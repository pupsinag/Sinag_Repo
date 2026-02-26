const { Intern, User, Company, InternDocuments, Supervisor } = require('../models');

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

    // Step 1: Fetch interns for program - START SIMPLE
    console.log('[getMatchingInterns] Step 1️⃣ : Querying interns for program:', program);

    let interns;
    try {
      // First try: Just fetch interns without any includes
      console.log('[getMatchingInterns] Attempt 1: Basic query without includes...');
      interns = await Intern.findAll({
        where: { program },
        raw: true,
      });
      console.log('[getMatchingInterns] ✅ Basic query succeeded, found', interns.length, 'interns');
    } catch (basicErr) {
      console.error('[getMatchingInterns] ❌ Basic query failed:', basicErr.message);
      return res.status(500).json({ 
        message: 'Basic query failed',
        error: process.env.NODE_ENV === 'development' ? basicErr.message : undefined
      });
    }

    // Now try with User include
    try {
      console.log('[getMatchingInterns] Attempt 2: Query with User include...');
      interns = await Intern.findAll({
        where: { program },
        include: [
          { model: User, as: 'User', required: false }
        ],
      });
      console.log('[getMatchingInterns] ✅ User include succeeded');
    } catch (userErr) {
      console.error('[getMatchingInterns] ⚠️  User include failed:', userErr.message);
      // Continue without User include
    }

    // Now try with Company include
    try {
      console.log('[getMatchingInterns] Attempt 3: Query with Company include...');
      interns = await Intern.findAll({
        where: { program },
        include: [
          { model: User, as: 'User', required: false },
          { model: Company, as: 'company', required: false }
        ],
      });
      console.log('[getMatchingInterns] ✅ Company include succeeded');
    } catch (companyErr) {
      console.error('[getMatchingInterns] ⚠️  Company include failed:', companyErr.message);
      // Continue without Company include
    }

    // Now try with InternDocuments include
    try {
      console.log('[getMatchingInterns] Attempt 4: Query with InternDocuments include...');
      interns = await Intern.findAll({
        where: { program },
        include: [
          { model: User, as: 'User', required: false },
          { model: Company, as: 'company', required: false },
          { 
            model: InternDocuments, 
            as: 'InternDocuments', 
            attributes: ['id', 'intern_id', 'document_type', 'file_name', 'file_path', 'file_mime_type', 'uploaded_date', 'status', 'remarks'],
            required: false 
          }
        ],
      });
      console.log('[getMatchingInterns] ✅ InternDocuments include succeeded');
    } catch (docsErr) {
      console.error('[getMatchingInterns] ⚠️  InternDocuments include failed:', docsErr.message);
      // Continue without InternDocuments include
    }

    // Now try with Supervisor include
    try {
      console.log('[getMatchingInterns] Attempt 5: Query with Supervisor include...');
      interns = await Intern.findAll({
        where: { program },
        include: [
          { model: User, as: 'User', required: false },
          { model: Company, as: 'company', required: false },
          { 
            model: InternDocuments, 
            as: 'InternDocuments', 
            attributes: ['id', 'intern_id', 'document_type', 'file_name', 'file_path', 'file_mime_type', 'uploaded_date', 'status', 'remarks'],
            required: false 
          },
          { model: Supervisor, as: 'Supervisor', required: false }
        ],
      });
      console.log('[getMatchingInterns] ✅ Supervisor include succeeded');
    } catch (supervisorErr) {
      console.error('[getMatchingInterns] ⚠️  Supervisor include failed:', supervisorErr.message);
      // Continue with what we have
    }

    console.log('[getMatchingInterns] Step 1️⃣ COMPLETE: Found', interns.length, 'interns');

    // Step 2: Filter by yearSection in JavaScript
    console.log('[getMatchingInterns] Step 2️⃣ : Filtering by yearSection');
    let filteredInterns = interns;
    if (yearSection) {
      const normalizedAdviserYearSection = (yearSection || '').replace(/\s/g, '').toLowerCase();
      filteredInterns = interns.filter(intern => {
        const normalizedInternYearSection = (intern.year_section || '').replace(/\s/g, '').toLowerCase();
        return normalizedAdviserYearSection === normalizedInternYearSection;
      });
      console.log('[getMatchingInterns] Filtered from', interns.length, 'to', filteredInterns.length, 'interns');
    }

    // Step 3: Transform documents
    console.log('[getMatchingInterns] Step 3️⃣ : Transforming data');
    const transformedInterns = filteredInterns.map((intern) => {
      const internData = intern.toJSON ? intern.toJSON() : intern;
      
      console.log(`[getMatchingInterns] Intern ${intern.id} data:`, {
        id: intern.id,
        user_id: intern.user_id,
        program: intern.program,
        year_section: intern.year_section,
        hasInternDocuments: !!internData.InternDocuments,
        InternDocumentsCount: Array.isArray(internData.InternDocuments) ? internData.InternDocuments.length : 0,
        InternDocumentsData: internData.InternDocuments
      });
      
      // Return documents as-is instead of aggregating
      if (Array.isArray(internData.InternDocuments) && internData.InternDocuments.length > 0) {
        internData.InternDocuments.forEach((doc) => {
          console.log(`[getMatchingInterns]   - Document: id=${doc.id}, type=${doc.document_type}, file_name=${doc.file_name}, file_path=${doc.file_path}`);
        });
      } else {
        console.log(`[getMatchingInterns] ⚠️  Intern ${intern.id} has NO documents`);
      }
      
      return {
        ...internData,
        InternDocuments: Array.isArray(internData.InternDocuments) ? internData.InternDocuments : [],
      };
    });

    console.log('[getMatchingInterns] ✅ SUCCESS - returning', transformedInterns.length, 'interns');
    console.log('[getMatchingInterns] Sample data:', JSON.stringify(transformedInterns[0], null, 2));
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

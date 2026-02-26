const { Intern, User, Company, InternDocuments, Supervisor } = require('../models');
const { Op } = require('sequelize');

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

    let interns;
    try {
      console.log('[getMatchingInterns] Attempting to fetch interns...');
      interns = await Intern.findAll({
        where: { program },
        include: [
          { model: User, as: 'User', required: false },
          { model: Company, as: 'company', required: false },
          { model: Supervisor, as: 'Supervisor', required: false }
        ],
      });
      console.log('[getMatchingInterns] ✅ Basic query succeeded, found', interns.length, 'interns');
    } catch (queryErr) {
      console.error('[getMatchingInterns] ❌ Basic query failed:', queryErr.message);
      return res.status(500).json({ 
        message: 'Failed to fetch interns',
        error: process.env.NODE_ENV === 'development' ? queryErr.message : undefined
      });
    }

    // Step 1b: Separately fetch documents for these interns
    console.log('[getMatchingInterns] Step 1️⃣b: Fetching documents for interns...');
    const internIds = interns.map(i => i.id);
    console.log('[getMatchingInterns] Intern IDs to query for documents:', internIds);
    
    let allDocuments = [];
    try {
      if (internIds.length > 0) {
        console.log('[getMatchingInterns] Querying InternDocuments with Op.in for ids:', internIds);
        
        allDocuments = await InternDocuments.findAll({
          where: {
            intern_id: { [Op.in]: internIds }
          },
          attributes: ['id', 'intern_id', 'document_type', 'file_name', 'file_path', 'file_mime_type', 'uploaded_date', 'status', 'remarks'],
        });
        console.log('[getMatchingInterns] ✅ Found', allDocuments.length, 'documents total');
        
        if (allDocuments.length > 0) {
          console.log('[getMatchingInterns] First document:', JSON.stringify(allDocuments[0], null, 2));
        }
      } else {
        console.log('[getMatchingInterns] ⚠️  No intern IDs to query for documents');
      }
    } catch (docErr) {
      console.error('[getMatchingInterns] ❌ Failed to fetch documents:', docErr.message);
      console.error('[getMatchingInterns] ❌ Full error:', docErr);
      // Continue without documents - not critical
    }

    // Map documents to interns
    const documentsByInternId = {};
    allDocuments.forEach(doc => {
      if (!documentsByInternId[doc.intern_id]) {
        documentsByInternId[doc.intern_id] = [];
      }
      documentsByInternId[doc.intern_id].push(doc);
    });

    console.log('[getMatchingInterns] Mapped documents by intern ID:', Object.keys(documentsByInternId).length, 'interns have documents');

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

    // Step 3: Transform documents - attach fetched documents to interns
    console.log('[getMatchingInterns] Step 3️⃣ : Transforming data and attaching documents');
    const transformedInterns = filteredInterns.map((intern) => {
      const internData = intern.toJSON ? intern.toJSON() : intern;
      
      // Attach documents from the separately-fetched map
      const internDocuments = documentsByInternId[intern.id] || [];
      
      console.log(`[getMatchingInterns] Intern ${intern.id}:`, {
        id: intern.id,
        documentCount: internDocuments.length,
        documents: internDocuments.length > 0 ? internDocuments.map(d => ({ type: d.document_type, file: d.file_name })) : []
      });
      
      return {
        ...internData,
        InternDocuments: internDocuments,
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

// ADVISER – GET INTERNS MATCHING PROGRAM AND YEARSECTION
exports.getMatchingInterns = async (req, res) => {
  try {
    const { program, yearSection } = req.user;
    const adviserId = req.user.id; // ✅ ADD ADVISER ID
    console.log('--- [getMatchingInterns] Adviser ID:', adviserId);
    console.log('--- [getMatchingInterns] Adviser program:', program);
    console.log('--- [getMatchingInterns] Adviser yearSection:', yearSection);
    if (!program) {
      console.log('--- [getMatchingInterns] Adviser missing program');
      return res.status(400).json({ message: 'Program missing from user profile.' });
    }

    // ✅ FILTER BY adviser_id, program, AND year_section
    const whereCondition = { 
      program,
      adviser_id: adviserId // ✅ CRITICAL: Only show interns assigned to this adviser
    };

    // ✅ If adviser has a yearSection, MUST filter by it - critical for program with multiple year/sections
    if (yearSection) {
      whereCondition.year_section = yearSection;
      console.log('--- [getMatchingInterns] Filtering by yearSection:', yearSection);
    } else {
      console.log('--- [getMatchingInterns] No yearSection - returning all interns for program');
    }

    const interns = await require('../models').Intern.findAll({
      where: whereCondition,
      include: [
        { model: require('../models').User, as: 'User' },
        { model: require('../models').Company, as: 'company' },
        { model: require('../models').InternDocuments, as: 'InternDocuments' },
        { model: require('../models').Supervisor, as: 'Supervisor' },
      ],
    });
    
    // ✅ Transform the response to include document map at top level for easier access
    const transformedInterns = interns.map((intern) => {
      const internObj = intern.toJSON();
      
      // Build a document map keyed by document_type for easy lookup
      const documentsMap = {};
      if (internObj.InternDocuments && Array.isArray(internObj.InternDocuments)) {
        internObj.InternDocuments.forEach((doc) => {
          documentsMap[doc.document_type] = {
            id: doc.id,
            file_name: doc.file_name,
            file_path: doc.file_path,
            uploaded_date: doc.uploaded_date,
            status: doc.status,
            remarks: doc.remarks,
          };
        });
      }
      
      // Add the documents map at top level so frontend can easily access:
      // intern.consent_form, intern.resume, etc. via documentsMap
      return {
        ...internObj,
        _documentsMap: documentsMap, // Internal map for frontend reference
        // Also add direct properties for backward compatibility
        consent_form: documentsMap['consent_form']?.file_path || null,
        notarized_agreement: documentsMap['notarized_agreement']?.file_path || null,
        portfolio: documentsMap['portfolio']?.file_path || null,
        resume: documentsMap['resume']?.file_path || null,
        cor: documentsMap['cor']?.file_path || null,
        insurance: documentsMap['insurance']?.file_path || null,
        medical_cert: documentsMap['medical_cert']?.file_path || null,
      };
    });
    
    transformedInterns.forEach((intern) => {
      console.log('--- [getMatchingInterns] Intern:', {
        id: intern.id,
        program: intern.program,
        year_section: intern.year_section,
        user_id: intern.user_id,
        user_program: intern.User?.program,
        user_firstName: intern.User?.firstName,
        user_lastName: intern.User?.lastName,
        documents: Object.keys(intern._documentsMap || {}),
      });
    });
    return res.json(transformedInterns);
  } catch (err) {
    console.error('❌ Error fetching matching interns:', err);
    res.status(500).json({ message: 'Server error' });
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

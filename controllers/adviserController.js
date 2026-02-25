/* eslint-env node */
const { Intern, User, Company, Supervisor, InternDocuments } = require('../models');
const { Op, fn, col, where } = require('sequelize');
const fs = require('fs');
const path = require('path');

/* =========================
   HELPER: Recover missing file path
========================= */
const recoverFilePath = (storedPath, docType, internLastName, uploadsDir) => {
  // If the stored path exists, use it
  const fullPath = path.join(uploadsDir, storedPath);
  if (fs.existsSync(fullPath)) {
    return storedPath;
  }

  console.log(`[recoverFilePath] File not found: ${storedPath}, searching for alternatives...`);

  // Try to find a file matching the document type and intern last name
  try {
    const files = fs.readdirSync(uploadsDir);
    
    // Build search patterns - STRICT matching to ensure we get the right intern's file
    const lastNamePart = internLastName.toUpperCase().replace(/\s/g, '_');
    const docTypePart = docType.toUpperCase().replace(/_/g, '_');
    
    console.log(`[recoverFilePath] Looking for files with lastName="${lastNamePart}" and docType="${docTypePart}"`);
    
    // Only look for files that have THIS SPECIFIC INTERN'S LAST NAME
    // This prevents accidentally returning another intern's document
    const candidateFiles = files.filter(f => 
      f.toUpperCase().startsWith(lastNamePart) && 
      (f.toUpperCase().includes(docType.toUpperCase()) || f.toUpperCase().includes(docTypePart))
    );
    
    console.log(`[recoverFilePath] Found ${candidateFiles.length} matching files: ${candidateFiles.join(', ')}`);
    
    if (candidateFiles.length > 0) {
      // Return the first (and should be only) matching file
      const recovered = candidateFiles[0];
      console.log(`[recoverFilePath] Using recovered file: ${recovered}`);
      return recovered;
    }

    console.log(`[recoverFilePath] No file found starting with "${lastNamePart}" for ${docType}`);
    return null;
  } catch (err) {
    console.error(`[recoverFilePath] Error searching for alternatives:`, err.message);
    return null;
  }
};

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

    const interns = await Intern.findAll({
      where: whereCondition,
      include: [
        { model: User, as: 'User', required: false },
        { model: Company, as: 'company', required: false },
        { model: InternDocuments, as: 'InternDocuments', required: false },
        { model: Supervisor, as: 'Supervisor', required: false },
      ],
      raw: false,
    });
    
    console.log(`--- [getMatchingInterns] Found ${interns.length} interns`);
    
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    // Transform InternDocuments array into object structure for frontend
    const transformedInterns = interns.map((intern) => {
      const internData = intern.toJSON ? intern.toJSON() : intern;
      
      // Log documents for debugging
      console.log(`--- [getMatchingInterns] Intern ${internData.id}:`);
      console.log(`    - Has User: ${!!internData.User}`);
      console.log(`    - Has Company: ${!!internData.company}`);
      console.log(`    - InternDocuments type: ${Array.isArray(internData.InternDocuments) ? 'array' : typeof internData.InternDocuments}`);
      console.log(`    - InternDocuments count: ${Array.isArray(internData.InternDocuments) ? internData.InternDocuments.length : 0}`);
      
      // Aggregate all documents into a single object with document_type as key
      const aggregatedDocs = {};
      if (Array.isArray(internData.InternDocuments) && internData.InternDocuments.length > 0) {
        internData.InternDocuments.forEach((doc) => {
          const docType = (doc.document_type || '').toLowerCase();
          
          // Try to recover missing file paths
          let filePath = doc.file_path;
          if (doc.file_path) {
            const recoveredPath = recoverFilePath(doc.file_path, docType, internData.User?.lastName || 'UNKNOWN', uploadsDir);
            if (recoveredPath) {
              filePath = recoveredPath;
            }
          }
          
          aggregatedDocs[docType] = filePath || null;
          console.log(`    - Document: ${docType} -> ${filePath || 'NOT FOUND'}`);
        });
      } else {
        console.log(`    - No documents found`);
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

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
    console.log('\n[getInternsForAdviser] ===== START =====');
    console.log('[getInternsForAdviser] User role:', userRole, 'User ID:', req.user.id);

    let whereCondition = {};

    // 🟢 COORDINATOR/SUPERADMIN: see ALL interns
    if (userRole === 'coordinator' || userRole === 'superadmin') {
      console.log('[getInternsForAdviser] Mode: Coordinator/Admin - Fetching ALL interns');
      whereCondition = {};
    }
    // 🟢 ADVISER: see only their interns
    else if (userRole === 'adviser') {
      console.log('[getInternsForAdviser] Mode: Adviser - Fetching interns for adviser:', req.user.id);
      whereCondition = { adviser_id: req.user.id };
    }

    console.log('[getInternsForAdviser] Where condition:', JSON.stringify(whereCondition));

    // Step 1: Get basic interns first
    console.log('[getInternsForAdviser] Step 1: Fetching interns from database...');
    const interns = await Intern.findAll({
      where: whereCondition,
      raw: true,
    });

    console.log(`[getInternsForAdviser] Step 1 COMPLETE: Found ${interns.length} interns`);
    
    if (interns.length === 0) {
      console.log('[getInternsForAdviser] No interns found, returning empty array');
      return res.json([]);
    }

    console.log('[getInternsForAdviser] Intern IDs:', interns.map((i) => i.id).join(', '));

    // Step 2: Get User data for each intern
    console.log('[getInternsForAdviser] Step 2: Fetching user data...');
    const internIds = interns.map((i) => i.user_id).filter(Boolean);
    const users = {};
    
    if (internIds.length > 0) {
      console.log('[getInternsForAdviser] User IDs to fetch:', internIds.join(', '));
      const userData = await User.findAll({
        where: { id: internIds },
        attributes: ['id', 'studentId', 'lastName', 'firstName', 'mi', 'email', 'program'],
        raw: true,
      });
      console.log(`[getInternsForAdviser] Step 2 COMPLETE: Found ${userData.length} users`);
      
      userData.forEach((u) => {
        users[u.id] = u;
      });
    }

    // Step 3: Get Company data for each intern
    console.log('[getInternsForAdviser] Step 3: Fetching company data...');
    const companyIds = interns.map((i) => i.company_id).filter(Boolean);
    const companies = {};
    
    if (companyIds.length > 0) {
      console.log('[getInternsForAdviser] Company IDs to fetch:', companyIds.join(', '));
      const companyData = await Company.findAll({
        where: { id: companyIds },
        attributes: ['id', 'name', 'email', 'address', 'supervisorName', 'natureOfBusiness'],
        raw: true,
      });
      console.log(`[getInternsForAdviser] Step 3 COMPLETE: Found ${companyData.length} companies`);
      
      companyData.forEach((c) => {
        companies[c.id] = c;
      });
    } else {
      console.log('[getInternsForAdviser] No company IDs found');
    }

    // Step 4: Get InternDocuments data for each intern
    console.log('[getInternsForAdviser] Step 4: Fetching intern documents...');
    const internIdsList = interns.map((i) => i.id).filter(Boolean);
    const docsMap = {};
    
    if (internIdsList.length > 0) {
      console.log('[getInternsForAdviser] Intern IDs to fetch documents for:', internIdsList.join(', '));
      const allDocs = await require('../models').InternDocuments.findAll({
        where: { intern_id: internIdsList },
        raw: true,
      });
      console.log(`[getInternsForAdviser] Step 4 COMPLETE: Found ${allDocs.length} documents`);
      
      // Build map to accumulate ALL documents for each intern (not just the last one)
      allDocs.forEach((doc) => {
        if (!docsMap[doc.intern_id]) {
          docsMap[doc.intern_id] = [];
        }
        docsMap[doc.intern_id].push(doc);
      });
    } else {
      console.log('[getInternsForAdviser] No intern IDs found for documents');
    }

    // Step 5: Transform InternDocuments array into object structure for frontend
    console.log('[getInternsForAdviser] Step 5: Transforming document data for frontend...');
    const docsByIntern = {};
    
    Object.entries(docsMap).forEach(([internId, docs]) => {
      const docObj = {};
      // Map document_type to frontend field names (snake_case as expected by frontend)
      docs.forEach((doc) => {
        const docType = doc.document_type || '';
        // Send as snake_case since frontend expects Ze.InternDocuments.consent_form
        docObj[docType.toLowerCase()] = doc.file_path;
      });
      docsByIntern[internId] = docObj;
      
      // Debug: Log what we're sending for first intern
      if (Object.keys(docsByIntern).length === 1) {
        console.log('[getInternsForAdviser] Sample InternDocuments object:', JSON.stringify(docObj, null, 2));
      }
    });
    console.log('[getInternsForAdviser] Step 5 COMPLETE: Documents transformed');

    // Step 6: Enrich interns with User, Company, and InternDocuments data
    console.log('[getInternsForAdviser] Step 6: Enriching intern data...');
    const enrichedInterns = interns.map((intern) => ({
      ...intern,
      User: users[intern.user_id] || null,
      company: intern.company_id ? companies[intern.company_id] || null : null,
      InternDocuments: docsByIntern[intern.id] || {}, // Keep as nested object, not spread
    }));

    console.log(`[getInternsForAdviser] ===== SUCCESS: Returning ${enrichedInterns.length} enriched interns with documents =====\n`);
    res.json(enrichedInterns);
  } catch (err) {
    console.error('\n❌ GET INTERNS FOR ADVISER ERROR');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('===== END ERROR =====\n');
    res.status(500).json({ message: 'Failed to fetch interns', error: err.message });
  }
};

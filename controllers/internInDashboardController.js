'use strict';

// ✅ LAZY LOAD - Require models inside functions to avoid circular dependency
function getModels() {
  return require('../models');
}

exports.getInterns = async (req, res, next) => {
  try {
    const { Intern, User, Company } = getModels();
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    console.log('\n[getInterns] ===== START =====');
    console.log('[getInterns] Full req.user:', JSON.stringify(req.user));
    console.log('[getInterns] User role:', userRole, 'User ID:', req.user.id);

    let whereCondition = {};

    // 🟢 COORDINATOR/SUPERADMIN: see ALL interns
    if (userRole === 'coordinator' || userRole === 'superadmin') {
      console.log('[getInterns] ✅ Mode: Coordinator/Admin - Fetching ALL interns');
      whereCondition = {};
    }
    // 🟢 ADVISER: see only their interns (filtered by program/year_section)
    else if (userRole === 'adviser') {
      console.log('[getInterns] ✅ Mode: Adviser - Fetching interns by program');
      const program = req.query.program || req.user?.program;
      const year_section = req.query.year_section || req.user?.yearSection || req.user?.year_section;

      if (program && year_section) {
        whereCondition = { program, year_section };
      } else if (program) {
        whereCondition = { program };
      }
    } else {
      console.log('[getInterns] ❌ UNKNOWN ROLE:', userRole);
      return res.status(403).json({ message: 'Invalid role for this endpoint' });
    }

    console.log('[getInterns] Where condition:', JSON.stringify(whereCondition));

    // Step 1: Get basic interns first - NO STATUS FILTER
    console.log('[getInterns] Step 1: Fetching interns from database (ALL statuses)...');
    console.log('[getInterns] Query: Intern.findAll with where =', JSON.stringify(whereCondition));
    
    const interns = await Intern.findAll({
      where: whereCondition,
      raw: true,
    });

    console.log(`[getInterns] Step 1 COMPLETE: Found ${interns.length} interns`);
    if (interns.length > 0) {
      console.log('[getInterns] First intern sample:', JSON.stringify(interns[0], null, 2));
    }

    if (interns.length === 0) {
      console.log('[getInterns] ℹ️ No interns found in database');
      return res.json([]);
    }

    console.log('[getInterns] Intern IDs:', interns.map((i) => i.id).join(', '));
    console.log('[getInterns] User IDs in interns:', interns.map((i) => i.user_id).join(', '));
    console.log('[getInterns] Company IDs in interns:', interns.map((i) => i.company_id).join(', '));

    // Step 2: Get User data for each intern
    console.log('[getInterns] Step 2: Fetching user data...');
    const internIds = interns.map((i) => i.user_id).filter(Boolean);
    const users = {};

    if (internIds.length > 0) {
      console.log('[getInterns] User IDs to fetch:', internIds.join(', '));
      const userData = await User.findAll({
        where: { id: internIds },
        attributes: ['id', 'studentId', 'lastName', 'firstName', 'mi', 'email', 'program', 'yearSection'],
        raw: true,
      });
      console.log(`[getInterns] Step 2 COMPLETE: Found ${userData.length} users`);
      if (userData.length > 0) {
        console.log('[getInterns] Sample user:', JSON.stringify(userData[0]));
      }

      userData.forEach((u) => {
        users[u.id] = u;
      });
    } else {
      console.log('[getInterns] ⚠️ No user IDs found in interns!');
    }

    // Step 3: Get Company data for each intern
    console.log('[getInterns] Step 3: Fetching company data...');
    const companyIds = interns.map((i) => i.company_id).filter(Boolean);
    const companies = {};

    if (companyIds.length > 0) {
      console.log('[getInterns] Company IDs to fetch:', companyIds.join(', '));
      const companyData = await Company.findAll({
        where: { id: companyIds },
        attributes: ['id', 'name', 'email', 'address', 'supervisorName', 'natureOfBusiness'],
        raw: true,
      });
      console.log(`[getInterns] Step 3 COMPLETE: Found ${companyData.length} companies`);
      if (companyData.length > 0) {
        console.log('[getInterns] Sample company:', JSON.stringify(companyData[0]));
      }

      companyData.forEach((c) => {
        companies[c.id] = c;
      });
    } else {
      console.log('[getInterns] ℹ️ No company IDs found');
    }

    // Step 4: Enrich interns with User and Company data
    console.log('[getInterns] Step 4: Enriching intern data...');
    const enrichedInterns = interns.map((intern) => ({
      ...intern,
      User: users[intern.user_id] || null,
      company: intern.company_id ? companies[intern.company_id] || null : null,
    }));

    console.log(`[getInterns] ===== SUCCESS: Returning ${enrichedInterns.length} enriched interns =====\n`);
    return res.json(enrichedInterns);
  } catch (err) {
    console.error('\n❌ GET INTERNS ERROR');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('===== END ERROR =====\n');
    return res.status(500).json({ message: 'Failed to fetch interns', error: err.message });
  }
};

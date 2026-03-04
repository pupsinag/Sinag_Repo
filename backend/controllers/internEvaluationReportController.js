const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const { Intern, User, Company, InternEvaluation, InternEvaluationItem, SupervisorEvaluation, SupervisorEvaluationItem, HTEEvaluation, Supervisor } = require('../models');

exports.generateInternEvaluationReport = async (req, res) => {
  console.log('\n\n========== generateInternEvaluationReport STARTED ==========');
  console.log('Request body:', JSON.stringify(req.body));
  console.log('Request user:', req.user ? { id: req.user.id, role: req.user.role } : 'NO USER');
  
  let doc;

  try {
    const { program, year_section } = req.body;
    console.log('[generateInternEvaluationReport] program=', program, ', year_section=', year_section);
    
    if (!program) {
      console.error('[generateInternEvaluationReport] ❌ Program is required');
      return res.status(400).json({ message: 'Program is required' });
    }

    // Fetch adviser name for the program and year_section
    let adviserWhere = { role: 'adviser', program };
    
    // If year_section is provided, also match on yearSection
    if (year_section) {
      adviserWhere.yearSection = year_section;
    }
    
    const adviser = await User.findOne({
      where: adviserWhere,
    });
    const adviserName = adviser ? `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim().toUpperCase() : 'N/A';
    console.log('[generateInternEvaluationReport] Adviser where clause:', adviserWhere);
    console.log('[generateInternEvaluationReport] Adviser name:', adviserName);

    /* =============================
       FETCH DATA
    ============================== */
    let whereClause = {
      program: program,
    };

    // Only add year_section filter if provided
    if (year_section) {
      whereClause.year_section = year_section;
    }
    
    console.log('[generateInternEvaluationReport] Fetching interns with where clause:', JSON.stringify(whereClause));

    let interns = []; // Declare outside if block
    
    // Step 1: Get base intern data
    // Detect whether the `user_id` column exists in the `interns` table (production schema may differ).
    const internTableDesc = await sequelize.getQueryInterface().describeTable('interns').catch(() => null);
    const hasUserIdColumn = !!(internTableDesc && (internTableDesc.user_id || internTableDesc.userId));
    if (!hasUserIdColumn) {
      console.warn('[generateInternEvaluationReport] ⚠️ interns.user_id column not present in DB — user names will be shown as N/A');
    }
    const internAttributes = ['id', 'company_id', 'supervisor_id', 'program', 'year_section'];
    if (hasUserIdColumn) internAttributes.splice(1, 0, 'user_id'); // keep user_id second for easier mapping

    const baseInterns = await Intern.findAll({
      attributes: internAttributes,
      where: whereClause,
      raw: true,
    });
    console.log(`[generateInternEvaluationReport] Step 1: Found ${baseInterns.length} base interns (hasUserId=${hasUserIdColumn})`);

    let userMap = {};
    if (baseInterns.length > 0 && hasUserIdColumn) {
      // Step 2: Get User data (only if interns.user_id exists)
      const userIds = [...new Set(baseInterns.map(i => i.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const users = await User.findAll({
          attributes: ['id', 'firstName', 'lastName'],
          where: { id: userIds },
          raw: true,
        });
        userMap = Object.fromEntries(users.map(u => [u.id, u]));
        console.log(`[generateInternEvaluationReport] Step 2: Fetched ${users.length} users`);
      } else {
        console.log('[generateInternEvaluationReport] Step 2: No user_ids found on interns; skipping user lookup');
      }
    } else if (baseInterns.length > 0) {
      console.log('[generateInternEvaluationReport] Step 2: Skipping user lookup because interns.user_id is not present in DB');
    }

    let companyMap = {};
    let supervisorMap = {};
    
    if (baseInterns.length > 0) {

      // Step 3: Get Company and Supervisor data from interns table
      const companyIds = [...new Set(baseInterns.map(i => i.company_id).filter(Boolean))];
      const supervisorIds = [...new Set(baseInterns.map(i => i.supervisor_id).filter(Boolean))];
      
      console.log(`[generateInternEvaluationReport] Step 3: Looking up ${companyIds.length} companies and ${supervisorIds.length} supervisors`);
      
      // Fetch company names
      const companies = await Company.findAll({
        attributes: ['id', 'name'],
        where: { id: companyIds },
        raw: true,
      });
      companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]));
      console.log(`[generateInternEvaluationReport] Step 3a: Mapped ${companies.length} companies:`, companyMap);
      
      // Fetch supervisor names
      const supervisors = await Supervisor.findAll({
        attributes: ['id', 'name'],
        where: { id: supervisorIds },
        raw: true,
      });
      supervisorMap = Object.fromEntries(supervisors.map(s => [s.id, s.name || 'N/A']));
      console.log(`[generateInternEvaluationReport] Step 3b: Mapped ${supervisors.length} supervisors:`, supervisorMap);
      console.log(`[generateInternEvaluationReport] Step 3: Fetched ${companies.length} companies and ${supervisors.length} supervisors`);

      // Step 4: Get Supervisor Evaluations and Items (only source of truth)
      const internIds = baseInterns.map(i => i.id);
      
      // Fetch SupervisorEvaluations for all interns
      const supervisorEvaluations = await SupervisorEvaluation.findAll({
        attributes: ['id', 'intern_id'],
        where: { intern_id: internIds },
        raw: true,
      });
      
      const supervisorEvalIds = supervisorEvaluations.map(e => e.id);
      
      let supervisorEvalItems = [];
      if (supervisorEvalIds.length > 0) {
        supervisorEvalItems = await SupervisorEvaluationItem.findAll({
          attributes: ['id', 'evaluation_id', 'section', 'indicator', 'rating'],
          where: { evaluation_id: { [Op.in]: supervisorEvalIds } },
          raw: true,
        });
      }
      
      console.log(`[generateInternEvaluationReport] Fetched ${supervisorEvalItems.length} supervisor eval items for ${supervisorEvalIds.length} evaluations`);
      
      // Normalize supervisor evaluation items - preserve section info for CHARACTER vs COMPETENCE
      const normalizedSupervisorEvalItems = supervisorEvalItems.map(item => ({
        ...item,
        evaluation_id: item.evaluation_id,
        // Keep section as is (e.g., "Character", "Competence")
        section: item.section,
        itemText: item.indicator,
        score: item.rating,
      }));
      
      // All evaluation items come from supervisor evaluations
      const allEvalItems = normalizedSupervisorEvalItems;
      
      // All evaluations from supervisor_evaluations table
      const allEvaluations = supervisorEvaluations;
      
      // Map evaluations to interns and attach items
      const evaluationsByIntern = {};
      allEvaluations.forEach(evaluation => {
        const evaluationWithItems = {
          ...evaluation,
          items: allEvalItems.filter(item => item.evaluation_id === evaluation.id),
        };
        if (!evaluationsByIntern[evaluation.intern_id]) {
          evaluationsByIntern[evaluation.intern_id] = [];
        }
        evaluationsByIntern[evaluation.intern_id].push(evaluationWithItems);
      });
      console.log(`[generateInternEvaluationReport] Step 4: Fetched ${allEvaluations.length} supervisor evaluations with ${allEvalItems.length} items`);

      // Enrich interns with related data
      interns = baseInterns.map(intern => ({
        ...intern,
        User: userMap[intern.user_id] || {},
        supervisorName: supervisorMap[intern.supervisor_id] || 'N/A',
        companyName: companyMap[intern.company_id] || 'N/A',
        Evaluations: evaluationsByIntern[intern.id] || [],
      }));

      // Sort by last name
      interns.sort((a, b) => {
        const nameA = (a.User?.lastName || '').toLowerCase();
        const nameB = (b.User?.lastName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      console.log('[generateInternEvaluationReport] Interns sorted by last name');
    }
    
    console.log(`[generateInternEvaluationReport] Total enriched interns: ${baseInterns.length}`);

    /* =============================
       PDF SETUP
    ============================== */
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=interns_evaluation.pdf');

    doc = new PDFDocument({
      size: 'Legal',
      layout: 'landscape',
      margin: 40,
    });

    doc.pipe(res);

    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    /* =============================
       HEADER
    ============================== */
    const logoPath = path.join(process.cwd(), 'pup_1904_flat.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, startX, 35, { width: 50 });
    }

    doc
      .fontSize(8)
      .text('REPUBLIC OF THE PHILIPPINES', startX + 70, 40)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('POLYTECHNIC UNIVERSITY OF THE PHILIPPINES', startX + 70, 52)
      .fontSize(8)
      .font('Helvetica')
      .text('OFFICE OF THE VICE PRESIDENT FOR CAMPUSES', startX + 70, 66)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('MARIVELES, BATAAN CAMPUS', startX + 70, 78);

    doc
      .moveTo(startX, 100)
      .lineTo(doc.page.width - doc.page.margins.right, 100)
      .stroke();

    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('INTERNS EVALUATION', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text(`PROGRAM: ${program.toUpperCase()}`, { align: 'center' });

    doc.moveDown(1);

    // ========== FOOTER AT TOP ==========
    const currentDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#666666')
      .text(`Generated by PUPSINAG (PUP System for Internship Navigation and Guidance) on ${currentDate}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('black').font('Helvetica');

    /* =============================
       TABLE HEADER
    ============================== */
    let y = doc.y;
    doc.rect(startX, y, pageWidth, 26).fill('#800000');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');

    // Adjusted widths: Reduced Name, standardized score columns
    const cols = {
      no: { x: startX, w: 40 },
      name: { x: startX + 40, w: 200 },

      character: { x: startX + 240, w: 115 },
      competence: { x: startX + 355, w: 115 },
      supervisor: { x: startX + 470, w: 115 },
      company: { x: startX + 585, w: 115 },

      mean: { x: startX + 700, w: 100 },
    };

    doc.text('NO.', cols.no.x, y + 8, { width: cols.no.w, align: 'center' });
    doc.text('STUDENT NAME', cols.name.x + 10, y + 8, { width: cols.name.w - 10 });
    doc.text('CHARACTER', cols.character.x, y + 8, { width: cols.character.w, align: 'center' });
    doc.text('COMPETENCE', cols.competence.x, y + 8, { width: cols.competence.w, align: 'center' });
    doc.text('SUPERVISOR', cols.supervisor.x, y + 8, { width: cols.supervisor.w, align: 'center' });
    doc.text('COMPANY / HTE', cols.company.x, y + 8, { width: cols.company.w, align: 'center' });
    doc.text('OVERALL MEAN', cols.mean.x, y + 8, { width: cols.mean.w, align: 'center' });

    y += 26;
    doc.fillColor('black').font('Helvetica').fontSize(9);

    /* =============================
       TABLE ROWS
    ============================== */
    interns.forEach((intern, index) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = doc.page.margins.top;
        // Redraw Header on new page
        doc.rect(startX, y, pageWidth, 26).fill('#800000');
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
        doc.text('NO.', cols.no.x, y + 8, { width: cols.no.w, align: 'center' });
        doc.text('STUDENT NAME', cols.name.x + 10, y + 8, { width: cols.name.w - 10 });
        doc.text('CHARACTER', cols.character.x, y + 8, { width: cols.character.w, align: 'center' });
        doc.text('COMPETENCE', cols.competence.x, y + 8, { width: cols.competence.w, align: 'center' });
        doc.text('SUPERVISOR', cols.supervisor.x, y + 8, { width: cols.supervisor.w, align: 'center' });
        doc.text('COMPANY / HTE', cols.company.x, y + 8, { width: cols.company.w, align: 'center' });
        doc.text('OVERALL MEAN', cols.mean.x, y + 8, { width: cols.mean.w, align: 'center' });
        y += 26;
        doc.fillColor('black').font('Helvetica').fontSize(9);
      }
      // Defensive: if no User metadata is available, still render the row with 'N/A' for the name.
      // Production DBs may lack interns.user_id; do not skip the entire row.
      // (previous behavior: `if (!intern.User) return;` - removed)
      const evaluation = Array.isArray(intern.Evaluations) ? intern.Evaluations[0] : null;
      const items = evaluation && Array.isArray(evaluation.items) ? evaluation.items : [];
      
      // Group items by section (CHARACTER and COMPETENCE)
      let characterScores = [];
      let competenceScores = [];
      
      items.forEach((item) => {
        if (item && item.score) {
          const score = Number(item.score);
          const section = (item.section || '').toLowerCase();
          if (section.includes('character')) {
            characterScores.push(score);
          } else if (section.includes('competence')) {
            competenceScores.push(score);
          }
        }
      });
      
      // Calculate means for CHARACTER and COMPETENCE
      const characterMean = characterScores.length > 0 
        ? (characterScores.reduce((a, b) => a + b, 0) / characterScores.length).toFixed(2)
        : 'N/A';
      const competenceMean = competenceScores.length > 0 
        ? (competenceScores.reduce((a, b) => a + b, 0) / competenceScores.length).toFixed(2)
        : 'N/A';
      
      // Overall mean = average of CHARACTER and COMPETENCE means
      let overallMean = 'N/A';
      if (characterMean !== 'N/A' && competenceMean !== 'N/A') {
        overallMean = ((Number(characterMean) + Number(competenceMean)) / 2).toFixed(2);
      }
      
      // Get supervisor name and company name from interns table data
      const supervisorName = intern.supervisorName || 'N/A';
      const companyName = intern.companyName || 'N/A';
      const lastName = intern.User?.lastName?.toUpperCase() || 'N/A';
      const firstName = intern.User?.firstName?.toUpperCase() || 'N/A';
      
      // Draw Row Border
      doc.rect(startX, y, pageWidth, 20).stroke('#CCCCCC');
      // Row Data
      doc.text(index + 1, cols.no.x, y + 6, { width: cols.no.w, align: 'center' });
      doc.text(
        `${lastName}, ${firstName}`,
        cols.name.x + 10,
        y + 6,
        { width: cols.name.w - 10, ellipsis: true },
      );
      // CHARACTER mean from supervisor evaluations
      doc.text(String(characterMean), cols.character.x, y + 6, {
        width: cols.character.w,
        align: 'center',
      });
      // COMPETENCE mean from supervisor evaluations
      doc.text(String(competenceMean), cols.competence.x, y + 6, {
        width: cols.competence.w,
        align: 'center',
      });
      // Supervisor name (assigned supervisor for intern)
      doc.text(supervisorName, cols.supervisor.x, y + 6, {
        width: cols.supervisor.w,
        align: 'center',
      });
      // Company name where intern is assigned
      doc.text(companyName, cols.company.x, y + 6, {
        width: cols.company.w,
        align: 'center',
      });
      // Overall Mean = average of CHARACTER and COMPETENCE
      doc.text(String(overallMean), cols.mean.x, y + 6, { width: cols.mean.w, align: 'center' });
      y += 20;
    });

    doc.end();
  } catch (err) {
    console.error('\n❌ INTERN EVALUATION REPORT ERROR');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('===== END ERROR =====\n');
    if (doc) doc.end();
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Failed to generate Intern Evaluation report',
        error: err.message,
      });
    }
  }
};

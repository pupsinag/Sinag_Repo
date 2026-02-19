const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const { Intern, User, Company, InternEvaluation, InternEvaluationItem, Supervisor } = require('../models');

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

    // Fetch adviser name for the program
    const adviser = await User.findOne({
      where: { role: 'adviser', program },
    });
    const adviserName = adviser ? `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim().toUpperCase() : 'N/A';
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
    const baseInterns = await Intern.findAll({
      where: whereClause,
      raw: true,
    });
    console.log(`[generateInternEvaluationReport] Step 1: Found ${baseInterns.length} base interns`);

    if (baseInterns.length > 0) {
      // Step 2: Get User data
      const userIds = [...new Set(baseInterns.map(i => i.user_id).filter(Boolean))];
      const users = await User.findAll({
        where: { id: userIds },
        raw: true,
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      console.log(`[generateInternEvaluationReport] Step 2: Fetched ${users.length} users`);

      // Step 3: Get Company and Supervisor data
      const companyIds = [...new Set(baseInterns.map(i => i.company_id).filter(Boolean))];
      const supervisorIds = [...new Set(baseInterns.map(i => i.supervisor_id).filter(Boolean))];
      
      const companies = await Company.findAll({
        where: { id: companyIds },
        raw: true,
      });
      const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
      
      const supervisors = await Supervisor.findAll({
        where: { id: supervisorIds },
        raw: true,
      });
      const supervisorMap = Object.fromEntries(supervisors.map(s => [s.id, s]));
      console.log(`[generateInternEvaluationReport] Step 3: Fetched ${companies.length} companies and ${supervisors.length} supervisors`);

      // Step 4: Get Evaluations and Evaluation Items
      const internIds = baseInterns.map(i => i.id);
      const evaluations = await InternEvaluation.findAll({
        where: { intern_id: internIds },
        raw: true,
      });
      const evalIds = evaluations.map(e => e.id);

      let evaluationItems = [];
      if (evalIds.length > 0) {
        const { Op } = require('sequelize');
        evaluationItems = await InternEvaluationItem.findAll({
          where: { evaluationId: { [Op.in]: evalIds } },
          raw: true,
        });
      }
      console.log(`[generateInternEvaluationReport] Fetched ${evaluationItems.length} evaluation items for ${evalIds.length} evaluations`);
      
      // Map evaluations to interns and attach items
      const evaluationsByIntern = {};
      evaluations.forEach(eval => {
        const evalWithItems = {
          ...eval,
          items: evaluationItems.filter(item => item.evaluationId === eval.id),
        };
        if (!evaluationsByIntern[eval.intern_id]) {
          evaluationsByIntern[eval.intern_id] = [];
        }
        evaluationsByIntern[eval.intern_id].push(evalWithItems);
      });
      console.log(`[generateInternEvaluationReport] Step 4: Fetched ${evaluations.length} evaluations with ${evaluationItems.length} items`);

      // Enrich interns with related data
      interns = baseInterns.map(intern => ({
        ...intern,
        User: userMap[intern.user_id] || {},
        company: companyMap[intern.company_id] || {},
        Supervisor: supervisorMap[intern.supervisor_id] || {},
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
      // Defensive: skip if no User
      if (!intern.User) return;
      const evaluation = Array.isArray(intern.Evaluations) ? intern.Evaluations[0] : null;
      const items = evaluation && Array.isArray(evaluation.items) ? evaluation.items : [];
      const categoryScores = {
        CHARACTER: [],
        COMPETENCE: [],
      };
      items.forEach((item) => {
        if (item && categoryScores[item.category]) {
          categoryScores[item.category].push(Number(item.score));
        }
      });
      // Average per category
      const characterAvg =
        categoryScores.CHARACTER.length > 0
          ? categoryScores.CHARACTER.reduce((a, b) => a + b, 0) / categoryScores.CHARACTER.length
          : null;
      const competenceAvg =
        categoryScores.COMPETENCE.length > 0
          ? categoryScores.COMPETENCE.reduce((a, b) => a + b, 0) / categoryScores.COMPETENCE.length
          : null;
      // Overall mean
      const validAverages = [characterAvg, competenceAvg].filter((v) => typeof v === 'number');
      const mean =
        validAverages.length > 0 ? (validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(2) : 'N/A';
      // Draw Row Border
      doc.rect(startX, y, pageWidth, 20).stroke('#CCCCCC');
      // Row Data
      doc.text(index + 1, cols.no.x, y + 6, { width: cols.no.w, align: 'center' });
      doc.text(
        `${intern.User.lastName ? intern.User.lastName.toUpperCase() : 'N/A'}, ${intern.User.firstName ? intern.User.firstName.toUpperCase() : 'N/A'}`,
        cols.name.x + 10,
        y + 6,
        { width: cols.name.w - 10, ellipsis: true },
      );
      doc.text(characterAvg !== null ? characterAvg.toFixed(2) : 'N/A', cols.character.x, y + 6, {
        width: cols.character.w,
        align: 'center',
      });
      doc.text(competenceAvg !== null ? competenceAvg.toFixed(2) : 'N/A', cols.competence.x, y + 6, {
        width: cols.competence.w,
        align: 'center',
      });
      const supervisorName = intern.Supervisor?.name || 'N/A';
      const companyName = intern.company?.name || 'N/A';
      doc.text(supervisorName ? supervisorName.toUpperCase() : 'N/A', cols.supervisor.x, y + 6, {
        width: cols.supervisor.w,
        align: 'center',
        ellipsis: true,
      });
      doc.text(companyName ? companyName.toUpperCase() : 'N/A', cols.company.x, y + 6, {
        width: cols.company.w,
        align: 'center',
        ellipsis: true,
      });
      doc.text(mean, cols.mean.x, y + 6, { width: cols.mean.w, align: 'center' });
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

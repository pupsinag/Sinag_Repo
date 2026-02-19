const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Intern, User, Company, SupervisorEvaluation, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get available years/sections for a program
exports.getAvailableYears = async (programId) => {
  try {
    const years = await sequelize.query(
      `SELECT DISTINCT year_section FROM interns 
       WHERE REPLACE(LOWER(program), ' ', '') = ?
       ORDER BY year_section ASC`,
      {
        replacements: [programId.replace(/\s/g, '').toLowerCase()],
        type: sequelize.QueryTypes.SELECT,
      },
    );

    return years.map((y) => y.year_section).filter(Boolean);
  } catch (error) {
    console.error('❌ GET AVAILABLE YEARS ERROR:', error.message);
    throw error;
  }
};

// Get interns by HTE
exports.getInternsByHTE = async (programId, year) => {
  try {
    if (!programId) throw new Error('Program ID is required');

    let query = `
      SELECT i.*, u.id as userId, u.firstName, u.lastName, u.email,
             c.id as companyId, c.name as companyName
      FROM interns i
      INNER JOIN users u ON i.user_id = u.id
      LEFT JOIN companies c ON i.company_id = c.id
      WHERE REPLACE(LOWER(i.program), ' ', '') = ?
    `;

    const replacements = [programId.replace(/\s/g, '').toLowerCase()];

    if (year) {
      query += ` AND REPLACE(LOWER(i.year_section), ' ', '') = ?`;
      replacements.push(year.replace(/\s/g, '').toLowerCase());
    }

    query += ` ORDER BY u.lastName ASC`;

    const interns = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    return interns;
  } catch (error) {
    console.error('❌ GET INTERNS BY HTE ERROR:', error.message);
    throw error;
  }
};

// Get advisers for a program
exports.getAdvisers = async (programId) => {
  try {
    if (!programId) throw new Error('Program ID is required');

    const advisers = await User.findAll({
      where: {
        role: 'adviser',
        program: programId,
      },
      order: [['lastName', 'ASC']],
    });

    return advisers;
  } catch (error) {
    console.error('❌ GET ADVISERS ERROR:', error.message);
    throw error;
  }
};

// Get intern evaluations
exports.getInternEvaluations = async (programId, year) => {
  try {
    if (!programId) throw new Error('Program ID is required');

    let query = `
      SELECT i.*, u.id as userId, u.firstName, u.lastName, u.email,
             c.id as companyId, c.name as companyName,
             ie.id as evaluationId, ie.totalScore
      FROM interns i
      INNER JOIN users u ON i.user_id = u.id
      LEFT JOIN companies c ON i.company_id = c.id
      LEFT JOIN intern_evaluations ie ON i.id = ie.intern_id
      WHERE REPLACE(LOWER(i.program), ' ', '') = ?
    `;

    const replacements = [programId.replace(/\s/g, '').toLowerCase()];

    if (year) {
      query += ` AND REPLACE(LOWER(i.year_section), ' ', '') = ?`;
      replacements.push(year.replace(/\s/g, '').toLowerCase());
    }

    query += ` ORDER BY u.lastName ASC`;

    const interns = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    return interns;
  } catch (error) {
    console.error('❌ GET INTERN EVALUATIONS ERROR:', error.message);
    throw error;
  }
};

exports.generateInternToSupervisorEvaluationSummary = async (req, res) => {
  console.log('\n\n========== generateInternToSupervisorEvaluationSummary STARTED ==========');
  console.log('Request body:', JSON.stringify(req.body));
  console.log('Request user:', req.user ? { id: req.user.id, role: req.user.role } : 'NO USER');
  
  let doc;
  try {
    // Fetch all evaluations (no program filter)
    console.log('[generateInternToSupervisorEvaluationSummary] Fetching supervisor evaluations');
    
    let evaluations = []; // Declare outside if block
    
    // Step 1: Get base evaluations
    const baseEvaluations = await SupervisorEvaluation.findAll({
      attributes: ['id', 'intern_id', 'company_id', 'rating', 'date'],
      raw: true,
    });
    console.log(`[generateInternToSupervisorEvaluationSummary] Step 1: Found ${baseEvaluations.length} base evaluations`);

    evaluations = baseEvaluations;
    
    if (baseEvaluations.length > 0) {
      // Step 2: Get Intern and related data
      const internIds = [...new Set(baseEvaluations.map(e => e.intern_id).filter(Boolean))];
      const interns = await Intern.findAll({
        where: { id: internIds },
        attributes: ['id', 'user_id', 'supervisor_id'],
        raw: true,
      });
      const internMap = Object.fromEntries(interns.map(i => [i.id, i]));

      // Step 2b: Get User data
      const userIds = [...new Set(interns.map(i => i.user_id).filter(Boolean))];
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'firstName', 'lastName'],
        raw: true,
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));

      // Step 2c: Get Supervisor data
      const supervisorIds = [...new Set(interns.map(i => i.supervisor_id).filter(Boolean))];
      const supervisors = await require('../models').Supervisor.findAll({
        where: { id: supervisorIds },
        attributes: ['id', 'name'],
        raw: true,
      });
      const supervisorMap = Object.fromEntries(supervisors.map(s => [s.id, s]));
      console.log(`[generateInternToSupervisorEvaluationSummary] Step 2: Fetched ${interns.length} interns, ${users.length} users, ${supervisors.length} supervisors`);

      // Step 3: Get Company data
      const companyIds = [...new Set(baseEvaluations.map(e => e.company_id).filter(Boolean))];
      const companies = await Company.findAll({
        where: { id: companyIds },
        attributes: ['id', 'name'],
        raw: true,
      });
      const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
      console.log(`[generateInternToSupervisorEvaluationSummary] Step 3: Fetched ${companies.length} companies`);

      // Step 4: Enrich evaluations with related data
      evaluations = baseEvaluations.map(eval => {
        const intern = internMap[eval.intern_id] || {};
        const user = userMap[intern.user_id] || {};
        const supervisor = supervisorMap[intern.supervisor_id] || {};
        const company = companyMap[eval.company_id] || {};
        
        return {
          ...eval,
          intern: {
            id: intern.id,
            user_id: intern.user_id,
            supervisor_id: intern.supervisor_id,
            User: user,
            Supervisor: supervisor,
          },
          supervisorCompany: company,
        };
      });
      console.log(`[generateInternToSupervisorEvaluationSummary] Step 4: Enriched ${evaluations.length} evaluations`);
    }
    
    console.log(`[generateInternToSupervisorEvaluationSummary] Total evaluations: ${evaluations.length}`);

    // Fetch all SupervisorEvaluationItems
    const SupervisorEvaluationItem = require('../models')['SupervisorEvaluationItem'];
    const allItems = await SupervisorEvaluationItem.findAll();

    // Get unique item sections/indicators for columns (e.g., I, II, III, IV, V)
    const itemLabels = [];
    allItems.forEach((item) => {
      if (!itemLabels.includes(item.section)) {
        itemLabels.push(item.section);
      }
    });

    // If no items, provide a default single column
    if (itemLabels.length === 0) {
      itemLabels.push('Mean');
    }

    // Group items by evaluationId
    const itemsByEval = {};
    allItems.forEach((item) => {
      if (!itemsByEval[item.evaluationId]) itemsByEval[item.evaluationId] = [];
      itemsByEval[item.evaluationId].push(item);
    });

    // Prepare summary rows
    const summaryRows = evaluations.map((evalItem, idx) => {
      const company = evalItem.supervisorCompany ? evalItem.supervisorCompany.name : 'N/A';
      // Supervisor: get name from intern.Supervisor relation
      let supervisor = 'N/A';
      if (evalItem.intern && evalItem.intern.Supervisor && evalItem.intern.Supervisor.name) {
        supervisor = evalItem.intern.Supervisor.name;
      }
      const items = itemsByEval[evalItem.id] || [];
      // Calculate mean per item by section
      const means = itemLabels.map((label) => {
        const filtered = items.filter((i) => i.section === label && typeof i.rating === 'number');
        if (filtered.length === 0) return 'N/A';
        const sum = filtered.reduce((acc, i) => acc + i.rating, 0);
        const mean = sum / filtered.length;
        // Ensure we return a string and not NaN
        const meanValue = !isNaN(mean) && isFinite(mean) ? mean.toFixed(2) : 'N/A';
        return meanValue;
      });
      // Calculate total mean
      const allRatings = items.filter((i) => typeof i.rating === 'number').map((i) => i.rating);
      let totalMean = 'N/A';
      if (allRatings.length > 0) {
        const total = allRatings.reduce((a, b) => a + b, 0);
        const avg = total / allRatings.length;
        totalMean = !isNaN(avg) && isFinite(avg) ? avg.toFixed(2) : 'N/A';
      }
      return {
        no: idx + 1,
        company,
        supervisor,
        means,
        totalMean,
      };
    });

    // If no evaluations exist, provide feedback with full header
    if (summaryRows.length === 0) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename=intern_to_supervisor_evaluation_summary.pdf');
      doc = new PDFDocument({ size: 'Legal', layout: 'landscape', margin: 40 });
      doc.pipe(res);
      const startX = doc.page.margins.left;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Header
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
      doc.fontSize(14).font('Helvetica-Bold').text('INTERN TO SUPERVISOR EVALUATION SUMMARY', { align: 'center' });
      doc.moveDown(3);
      doc.fontSize(12).font('Helvetica').text('No supervisor evaluations available.', { align: 'center' });
      doc.end();
      return;
    }

    // PDF setup
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=intern_to_supervisor_evaluation_summary.pdf');
    doc = new PDFDocument({ size: 'Legal', layout: 'landscape', margin: 40 });
    doc.pipe(res);
    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header
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
    doc.fontSize(14).font('Helvetica-Bold').text('INTERN TO SUPERVISOR EVALUATION SUMMARY', { align: 'center' });
    doc.moveDown(1.5);

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

    // Table header
    let y = doc.y;
    // Dynamically calculate column widths
    const staticCols = [
      { key: 'no', label: 'NO.', minWidth: 40 },
      { key: 'company', label: 'COMPANY NAME', minWidth: 140 },
      { key: 'supervisor', label: 'SUPERVISOR', minWidth: 140 },
    ];
    const totalMeanMinWidth = 60;
    const availableWidth = pageWidth - staticCols.reduce((sum, col) => sum + col.minWidth, 0) - totalMeanMinWidth;
    // Ensure we don't divide by zero and meanColWidth is always a valid number
    const meanColWidth = Math.max(28, Math.floor((availableWidth > 0 ? availableWidth : 0) / Math.max(1, itemLabels.length)));
    
    // Validate meanColWidth is not NaN
    if (isNaN(meanColWidth) || meanColWidth <= 0) {
      throw new Error('Invalid column width calculation for mean columns');
    }

    // Calculate column positions
    let colX = startX;
    const cols = {};
    staticCols.forEach((col) => {
      cols[col.key] = { x: colX, w: col.minWidth };
      colX += col.minWidth;
    });
    cols.meanPerItem = { x: colX, w: meanColWidth * itemLabels.length };
    itemLabels.forEach((label, i) => {
      cols[`mean_${i}`] = { x: colX + i * meanColWidth, w: meanColWidth };
    });
    colX += meanColWidth * itemLabels.length;
    cols.totalMean = { x: colX, w: totalMeanMinWidth };

    // Draw header background (maroon, thick height)
    const headerHeight = 26;
    doc.rect(startX, y, pageWidth, headerHeight).fill('#800000');
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold');

    // Header text (no internal vertical lines for clarity)
    doc.text('NO.', cols.no.x, y + 8, { width: cols.no.w, align: 'center' });
    doc.text('COMPANY NAME', cols.company.x, y + 8, { width: cols.company.w, align: 'center' });
    doc.text('SUPERVISOR', cols.supervisor.x, y + 8, { width: cols.supervisor.w, align: 'center' });
    itemLabels.forEach((label, i) => {
      const labelStr = String(label || `Mean ${i + 1}`);
      doc.text(labelStr, cols[`mean_${i}`].x, y + 8, { width: cols[`mean_${i}`].w, align: 'center' });
    });
    doc.text('TOTAL MEAN', cols.totalMean.x, y + 8, { width: cols.totalMean.w, align: 'center' });

    y += headerHeight;

    // Table rows
    doc.fillColor('black').font('Helvetica').fontSize(9);
    summaryRows.forEach((row) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = doc.page.margins.top;
        // Redraw header for new page
        doc.rect(startX, y, pageWidth, headerHeight).fill('#800000');
        doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
        doc.text('NO.', cols.no.x, y + 8, { width: cols.no.w, align: 'center' });
        doc.text('COMPANY NAME', cols.company.x, y + 8, { width: cols.company.w, align: 'center' });
        doc.text('SUPERVISOR', cols.supervisor.x, y + 8, { width: cols.supervisor.w, align: 'center', ellipsis: true });
        itemLabels.forEach((label, i) => {
          const labelStr = String(label || `Mean ${i + 1}`);
          doc.text(labelStr, cols[`mean_${i}`].x, y + 8, { width: cols[`mean_${i}`].w, align: 'center' });
        });
        doc.text('TOTAL MEAN', cols.totalMean.x, y + 8, { width: cols.totalMean.w, align: 'center' });
        y += headerHeight;
        doc.fillColor('black').font('Helvetica').fontSize(9);
      }
      doc.rect(startX, y, pageWidth, 20).stroke('#CCCCCC');
      doc.text(String(row.no), cols.no.x, y + 6, { width: cols.no.w, align: 'center' });
      doc.text(String(row.company), cols.company.x, y + 6, { width: cols.company.w, align: 'center', ellipsis: true });
      doc.text(String(row.supervisor), cols.supervisor.x, y + 6, { width: cols.supervisor.w, align: 'center', ellipsis: true });
      row.means.forEach((mean, i) => {
        const meanStr = String(mean);
        doc.text(meanStr, cols[`mean_${i}`].x, y + 6, { width: cols[`mean_${i}`].w, align: 'center' });
      });
      const totalMeanStr = String(row.totalMean);
      doc.text(totalMeanStr, cols.totalMean.x, y + 6, { width: cols.totalMean.w, align: 'center' });
      y += 20;
    });

    doc.end();
  } catch (err) {
    // Enhanced error logging for debugging
    console.error('\n❌ INTERN TO SUPERVISOR EVALUATION SUMMARY ERROR');
    console.error('Error message:', err.message);
    if (err.stack) {
      console.error('Error stack:', err.stack);
    }
    console.error('===== END ERROR =====\n');
    if (doc) doc.end();
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Failed to generate Intern to Supervisor Evaluation Summary report',
        error: err.message,
        stack: err.stack,
      });
    }
  }
};

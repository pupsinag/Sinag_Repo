const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { Intern, InternDocuments, User, Company } = require('../models');

exports.generateInternSubmittedDocuments = async (req, res) => {
  console.log('\n\n========== generateInternSubmittedDocuments STARTED ==========');
  console.log('Request body:', JSON.stringify(req.body));
  console.log('Request user:', req.user ? { id: req.user.id, role: req.user.role } : 'NO USER');
  
  let doc;

  try {
    const { program, year_section } = req.body;
    console.log('[generateInternSubmittedDocuments] program=', program, ', year_section=', year_section);
    console.log('[generateInternSubmittedDocuments] Models loaded:', {
      Intern: !!Intern,
      InternDocuments: !!InternDocuments,
      User: !!User,
      Company: !!Company,
    });
    
    if (!program) {
      console.error('[generateInternSubmittedDocuments] ❌ Program is required');
      return res.status(400).json({ message: 'Program is required' });
    }

    // Fetch adviser name for the program
    const adviser = await User.findOne({
      where: { role: 'adviser', program },
    });
    const adviserName = adviser ? `${adviser.firstName || ''} ${adviser.lastName || ''}`.trim().toUpperCase() : 'N/A';
    console.log('[generateInternSubmittedDocuments] Adviser name:', adviserName);

    const { Op, fn, col, where } = require('sequelize');
    let whereClause = {
      program,
      [Op.and]: [],
    };
    if (year_section) {
      whereClause[Op.and].push(
        where(
          fn('REPLACE', fn('LOWER', col('year_section')), ' ', ''),
          Op.eq,
          year_section.replace(/\s/g, '').toLowerCase(),
        ),
      );
    }
    if (whereClause[Op.and].length === 0) delete whereClause[Op.and];
    
    console.log('[generateInternSubmittedDocuments] Fetching interns with where clause:', JSON.stringify(whereClause));
    
    // Step 1: Get base intern data
    const interns = await Intern.findAll({
      where: whereClause,
      attributes: ['id', 'user_id', 'company_id'],
      raw: true,
    });
    console.log(`[generateInternSubmittedDocuments] Step 1: Found ${interns.length} base interns`);

    if (interns.length === 0) {
      console.log('[generateInternSubmittedDocuments] No interns found, returning empty list');
    } else {
      // Step 2: Get user data
      const userIds = [...new Set(interns.map(i => i.user_id).filter(Boolean))];
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'firstName', 'lastName'],
        raw: true,
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      console.log(`[generateInternSubmittedDocuments] Step 2: Fetched ${users.length} users`);

      // Step 3: Get InternDocuments data
      const internIds = interns.map(i => i.id);
      const allDocs = await InternDocuments.findAll({
        where: { intern_id: internIds },
        attributes: ['id', 'intern_id', 'consent_form', 'notarized_agreement', 'resume', 'cor', 'insurance', 'medical_cert'],
        raw: true,
      });
      const docsMap = Object.fromEntries(allDocs.map(d => [d.intern_id, [d]]));
      console.log(`[generateInternSubmittedDocuments] Step 3: Fetched ${allDocs.length} documents`);

      // Step 4: Get Company data
      const companyIds = [...new Set(interns.map(i => i.company_id).filter(Boolean))];
      const companies = await Company.findAll({
        where: { id: companyIds },
        attributes: ['id', 'moaFile'],
        raw: true,
      });
      const companyMap = Object.fromEntries(companies.map(c => [c.id, c]));
      console.log(`[generateInternSubmittedDocuments] Step 4: Fetched ${companies.length} companies`);

      // Enrich interns with related data
      interns.forEach(intern => {
        intern.User = userMap[intern.user_id] || {};
        intern.InternDocuments = docsMap[intern.id] || [];
        intern.company = companyMap[intern.company_id] || {};
      });
    }
    
    console.log(`[generateInternSubmittedDocuments] Total enriched interns: ${interns.length}`);

    // Sort by last name
    interns.sort((a, b) => {
      const nameA = (a.User?.lastName || '').toLowerCase();
      const nameB = (b.User?.lastName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    console.log('[generateInternSubmittedDocuments] Interns sorted by last name');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=interns_submitted_documents.pdf');

    doc = new PDFDocument({
      size: 'Legal',
      layout: 'landscape',
      margin: 40,
    });

    doc.pipe(res);

    const startX = doc.page.margins.left;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

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
    doc.fontSize(14).font('Helvetica-Bold').text('INTERNS SUBMITTED DOCUMENTS', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').text(`PROGRAM: ${program.toUpperCase()}`, { align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica').text(`ADVISER: ${adviserName}`, { align: 'center' });

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

    let y = doc.y;
    doc.rect(startX, y, pageWidth, 26).fill('#800000');
    doc.fillColor('white').fontSize(7).font('Helvetica-Bold');

    const cols = {
      no: { x: startX + 5, w: 30 },
      name: { x: startX + 40, w: 210 },
      nc: { x: startX + 260, w: 90 },
      med: { x: startX + 360, w: 90 },
      ins: { x: startX + 460, w: 70 },
      moa: { x: startX + 540, w: 60 },
      cor: { x: startX + 610, w: 60 },
      ia: { x: startX + 680, w: 120 },
      res: { x: startX + 810, w: 70 },
    };

    doc.text('NO.', cols.no.x, y + 8, { width: cols.no.w });
    doc.text('STUDENT NAME', cols.name.x, y + 8, { width: cols.name.w });
    doc.text('NOTARIZED AGREEMENT', cols.nc.x, y + 8, { width: cols.nc.w, align: 'center' });
    doc.text('MEDICAL CERT', cols.med.x, y + 8, { width: cols.med.w, align: 'center' });
    doc.text('INSURANCE', cols.ins.x, y + 8, { width: cols.ins.w, align: 'center' });
    doc.text('MOA', cols.moa.x, y + 8, { width: cols.moa.w, align: 'center' });
    doc.text('COR', cols.cor.x, y + 8, { width: cols.cor.w, align: 'center' });
    doc.text('CONSENT FORM', cols.ia.x, y + 8, { width: cols.ia.w, align: 'center' });
    doc.text('RESUME', cols.res.x, y + 8, { width: cols.res.w, align: 'center' });

    y += 26;
    doc.fillColor('black').font('Helvetica').fontSize(7);

    // ✅ Use / for YES (submitted), X for NO (not submitted)
    const mark = (val) => {
      // A document is submitted if the value is a non-empty string (file path)
      if (typeof val === 'string' && val.trim().length > 0) {
        return '/'; // Forward slash for submitted
      }
      return 'X'; // X for not submitted
    };

    interns.forEach((intern, index) => {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      const internData = intern.get({ plain: true });
      const docsArray = internData.InternDocuments || [];
      const docs = docsArray.length > 0 ? docsArray[0] : {};
      const user = internData.User;
      const company = internData.company;

      // DEBUG: Log document data
      console.log(`[DEBUG] Intern: ${user?.firstName} ${user?.lastName}`);
      console.log(`[DEBUG] DocsArray length: ${docsArray.length}`);
      console.log(`[DEBUG] Docs object:`, docs);

      if (!user) return;

      doc.rect(startX, y, pageWidth, 18).stroke('#CCCCCC');

      doc.text(index + 1, cols.no.x, y + 5);
      doc.text(`${user.lastName || 'N/A'}, ${user.firstName || 'N/A'}`.trim(), cols.name.x, y + 5, {
        width: cols.name.w,
      });
      doc.text(mark(docs.notarized_agreement), cols.nc.x, y + 5, { width: cols.nc.w, align: 'center' });
      doc.text(mark(docs.medical_cert), cols.med.x, y + 5, { width: cols.med.w, align: 'center' });
      doc.text(mark(docs.insurance), cols.ins.x, y + 5, { width: cols.ins.w, align: 'center' });
      doc.text(mark(company?.moaFile), cols.moa.x, y + 5, { width: cols.moa.w, align: 'center' });
      doc.text(mark(docs.cor), cols.cor.x, y + 5, { width: cols.cor.w, align: 'center' });
      doc.text(mark(docs.consent_form), cols.ia.x, y + 5, { width: cols.ia.w, align: 'center' });
      doc.text(mark(docs.resume), cols.res.x, y + 5, { width: cols.res.w, align: 'center' });

      y += 18;
    });

    doc.end();
  } catch (err) {
    console.error('\n❌ INTERN DOCUMENT MATRIX ERROR');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    console.error('===== END ERROR =====\n');
    if (doc) doc.end();
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Failed to generate Intern Submitted Documents report',
        error: err.message
      });
    }
  }
};

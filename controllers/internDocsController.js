/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

const { Intern, Company, InternDocuments } = require('../models');

/* =========================
   UPLOAD / UPDATE INTERN DOCUMENT
========================= */
// POST /api/auth/intern-docs/upload
async function uploadInternDoc(req, res) {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (file.originalname.toLowerCase().includes('moa')) {
      return res.status(403).json({
        message: 'MOA is provided by the company and cannot be uploaded by interns',
      });
    }

    /* =========================
       FIND INTERN
    ========================= */
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    /* =========================
       GET COLUMN FROM REQUEST BODY
    ========================= */
    const targetColumn = req.body.column;

    if (!targetColumn) {
      return res.status(400).json({
        message: 'Document type not specified',
      });
    }

    const validColumns = ['notarized_agreement', 'medical_cert', 'insurance', 'resume', 'cor', 'consent_form'];
    if (!validColumns.includes(targetColumn)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    /* =========================
       FIND OR CREATE DOC ROW
    ========================= */
    const [docs] = await InternDocuments.findOrCreate({
      where: { intern_id: intern.id },
      defaults: { intern_id: intern.id },
    });

    /* =========================
       DELETE OLD FILE (IF ANY)
    ========================= */
    if (docs[targetColumn]) {
      const oldPath = path.join(__dirname, '..', 'uploads', docs[targetColumn]);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    docs[targetColumn] = file.filename;
    docs.uploaded_at = new Date();
    await docs.save();

    return res.json({
      message: 'Document uploaded successfully',
      column: targetColumn,
      file: file.filename,
    });
  } catch (err) {
    console.error('❌ UPLOAD INTERN DOC ERROR:', err);
    return res.status(500).json({ message: 'Failed to upload document' });
  }
}

/* =========================
   GET INTERN DOCUMENTS
========================= */
// GET /api/auth/intern-docs/me
async function getInternDocuments(req, res) {
  try {
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Company,
          as: 'company', // ✅ MUST MATCH Intern.associate
          attributes: ['moaFile'],
          required: false,
        },
      ],
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    const docs = await InternDocuments.findOne({
      where: { intern_id: intern.id },
    });

    return res.json({
      ...(docs?.dataValues || {}),
      MOA: intern.company?.moaFile || null,
    });
  } catch (err) {
    console.error('❌ GET INTERN DOCS ERROR:', err);
    return res.status(500).json({ message: 'Failed to fetch documents' });
  }
}

/* =========================
   DELETE INTERN DOCUMENT
========================= */
// DELETE /api/auth/intern-docs/:column
async function deleteInternDoc(req, res) {
  try {
    const { column } = req.params;

    if (column === 'MOA') {
      return res.status(403).json({
        message: 'MOA cannot be deleted by interns',
      });
    }

    const allowedColumns = ['consent_form', 'notarized_agreement', 'resume', 'cor', 'insurance', 'medical_cert'];

    if (!allowedColumns.includes(column)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
    });

    if (!intern) {
      return res.status(404).json({ message: 'Intern not found' });
    }

    const docs = await InternDocuments.findOne({
      where: { intern_id: intern.id },
    });

    if (!docs || !docs[column]) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', docs[column]);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    docs[column] = null;
    await docs.save();

    return res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE INTERN DOC ERROR:', err);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
}

module.exports = {
  uploadInternDoc,
  getInternDocuments,
  deleteInternDoc,
};

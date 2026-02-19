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
    console.log('[DEBUG] uploadInternDoc - req.user:', req.user?.id);
    console.log('[DEBUG] uploadInternDoc - req.file:', req.file?.filename);
    console.log('[DEBUG] uploadInternDoc - req.body:', req.body);

    const file = req.file;

    if (!file) {
      console.error('❌ No file provided in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify user is authenticated
    if (!req.user || !req.user.id) {
      console.error('❌ User not authenticated or missing user data');
      return res.status(401).json({ message: 'User authentication failed' });
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
      console.error('❌ Intern not found for user_id:', req.user.id);
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
       DELETE OLD FILE (IF ANY)
    ========================= */
    const existingDoc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: targetColumn },
    });

    if (existingDoc && existingDoc.file_path) {
      const oldPath = path.join(__dirname, '..', 'uploads', existingDoc.file_path);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
          console.log('✅ Deleted old file:', existingDoc.file_path);
        } catch (err) {
          console.warn('⚠️ Failed to delete old file:', err.message);
        }
      }
    }

    /* =========================
       CREATE OR UPDATE DOC RECORD
    ========================= */
    const docData = {
      intern_id: intern.id,
      document_type: targetColumn,
      file_name: file.originalname,
      file_path: file.filename,
      uploaded_date: new Date(),
      status: 'Pending',
    };

    let docs;
    if (existingDoc) {
      await existingDoc.update(docData);
      docs = existingDoc;
    } else {
      docs = await InternDocuments.create(docData);
    }

    console.log('✅ Document saved successfully:', {
      intern_id: intern.id,
      column: targetColumn,
      filename: file.filename,
    });

    return res.json({
      message: 'Document uploaded successfully',
      column: targetColumn,
      file: file.filename,
    });
  } catch (err) {
    console.error('❌ UPLOAD INTERN DOC ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
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

    // ✅ Get ALL documents for intern (multiple rows, one per document type)
    const docsList = await InternDocuments.findAll({
      where: { intern_id: intern.id },
      order: [['uploaded_date', 'DESC']],
    });

    // Transform array to object keyed by document_type for easier frontend use
    const docsObject = {};
    docsList.forEach(doc => {
      docsObject[doc.document_type] = {
        file_name: doc.file_name,
        file_path: doc.file_path,
        uploaded_date: doc.uploaded_date,
        status: doc.status,
        remarks: doc.remarks,
      };
    });

    return res.json({
      documents: docsObject,
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

    // Find the specific document by intern_id and document_type
    const doc = await InternDocuments.findOne({
      where: { 
        intern_id: intern.id,
        document_type: column
      },
    });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete the file from disk
    if (doc.file_path) {
      const filePath = path.join(__dirname, '..', 'uploads', doc.file_path);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('\u2705 Deleted file:', doc.file_path);
        } catch (err) {
          console.warn('\u26a0\ufe0f Failed to delete file:', err.message);
        }
      }
    }

    // Delete the document record from database
    await doc.destroy();

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

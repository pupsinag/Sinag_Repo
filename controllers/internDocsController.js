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
    try {
      if (existingDoc) {
        console.log('📝 Updating existing document record:', { intern_id: intern.id, document_type: targetColumn });
        await existingDoc.update(docData);
        docs = existingDoc;
        console.log('✅ Document record updated successfully');
      } else {
        console.log('📝 Creating new document record:', { intern_id: intern.id, document_type: targetColumn });
        docs = await InternDocuments.create(docData);
        console.log('✅ Document record created successfully with ID:', docs.id);
      }
    } catch (dbErr) {
      console.error('❌ DATABASE ERROR when saving document:', dbErr.message);
      console.error('   Full error:', dbErr);
      throw dbErr;
    }

    // Verify document was saved
    const verifyDoc = await InternDocuments.findOne({
      where: { intern_id: intern.id, document_type: targetColumn },
    });

    if (!verifyDoc) {
      console.error('❌ CRITICAL: Document was not found in database after save!');
      return res.status(500).json({
        message: 'Document upload failed - could not verify save',
        error: 'Database save verification failed'
      });
    }

    console.log('✅ Document verified in database:', {
      id: verifyDoc.id,
      intern_id: verifyDoc.intern_id,
      document_type: verifyDoc.document_type,
      file_path: verifyDoc.file_path,
    });

    return res.json({
      message: 'Document uploaded successfully',
      document: {
        id: verifyDoc.id,
        document_type: verifyDoc.document_type,
        file_name: verifyDoc.file_name,
        file_path: verifyDoc.file_path,
        uploaded_date: verifyDoc.uploaded_date,
        status: verifyDoc.status,
      }
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
    console.log('[getInternDocuments] Fetching for user_id:', req.user.id);
    
    const intern = await Intern.findOne({
      where: { user_id: req.user.id },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['moaFile'],
          required: false,
        },
      ],
    });

    if (!intern) {
      console.error('[getInternDocuments] Intern not found for user_id:', req.user.id);
      return res.status(404).json({ message: 'Intern not found' });
    }

    console.log('[getInternDocuments] Found intern:', intern.id);

    // ✅ Get ALL documents for intern (multiple rows, one per document type)
    const docsList = await InternDocuments.findAll({
      where: { intern_id: intern.id },
      order: [['uploaded_date', 'DESC']],
    });

    console.log('[getInternDocuments] Found', docsList.length, 'document(s) for intern', intern.id);
    docsList.forEach((doc, idx) => {
      console.log(`  [${idx}] ${doc.document_type} - ${doc.file_name}`);
    });

    // Transform array to object keyed by document_type for easier frontend use
    const docsObject = {};
    docsList.forEach(doc => {
      docsObject[doc.document_type] = {
        id: doc.id,
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
    console.error('❌ GET INTERN DOCS ERROR:', err.message);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({ 
      message: 'Failed to fetch documents',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
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

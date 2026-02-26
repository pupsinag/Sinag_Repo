/* eslint-env node */
const sharp = require('sharp');
const PDFDocument = require('pdfkit');
const { CompanyDocuments, Company } = require('../models');

/* =========================
   UPLOAD COMPANY DOCUMENT
========================= */
exports.uploadCompanyDocument = async (req, res) => {
  try {
    console.log('\n=== [uploadCompanyDocument] START ===');
    
    const companyId = req.user.id; // Company authenticated user
    const { documentType } = req.body;
    const file = req.file;

    console.log(`[uploadCompanyDocument] Company ID: ${companyId}`);
    console.log(`[uploadCompanyDocument] Document Type: ${documentType}`);
    console.log(`[uploadCompanyDocument] File:`, file ? { originalname: file.originalname, size: file.size, mimetype: file.mimetype } : 'NONE');

    // Validation
    if (!documentType) {
      return res.status(400).json({ message: 'Document type is required' });
    }

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Verify company exists
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check for duplicate - allow overwriting
    const existingDoc = await CompanyDocuments.findOne({
      where: {
        company_id: companyId,
        document_type: documentType,
      },
    });

    console.log(`[uploadCompanyDocument] Existing document: ${existingDoc ? 'YES (will overwrite)' : 'NO (new)'}`);

    // Create or update document record
    const documentData = {
      company_id: companyId,
      document_type: documentType,
      file_name: file.originalname,
      file_path: file.filename,
      file_content: file.buffer, // ✅ Store file content in database
      file_mime_type: file.mimetype,
      file_size: file.size,
      uploaded_date: new Date(),
      status: 'active',
    };

    let savedDoc;
    if (existingDoc) {
      console.log(`[uploadCompanyDocument] Updating existing document ID ${existingDoc.id}`);
      await existingDoc.update(documentData);
      savedDoc = existingDoc;
    } else {
      console.log(`[uploadCompanyDocument] Creating new document`);
      savedDoc = await CompanyDocuments.create(documentData);
    }

    console.log(`[uploadCompanyDocument] ✅ Document saved with ID: ${savedDoc.id}`);
    console.log('=== [uploadCompanyDocument] END ===\n');

    res.json({
      message: 'Document uploaded successfully',
      document: {
        id: savedDoc.id,
        documentType: savedDoc.document_type,
        fileName: savedDoc.file_name,
        uploadedDate: savedDoc.uploaded_date,
      },
    });
  } catch (err) {
    console.error('❌ [uploadCompanyDocument] Error:', err);
    res.status(500).json({
      message: 'Failed to upload document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/* =========================
   GET COMPANY DOCUMENTS
========================= */
exports.getCompanyDocuments = async (req, res) => {
  try {
    console.log('\n=== [getCompanyDocuments] START ===');
    
    const companyId = req.user.id;

    const documents = await CompanyDocuments.findAll({
      where: { company_id: companyId },
      attributes: ['id', 'document_type', 'file_name', 'file_mime_type', 'file_size', 'uploaded_date', 'status'],
      order: [['uploaded_date', 'DESC']],
    });

    console.log(`[getCompanyDocuments] ✅ Found ${documents.length} documents`);
    console.log('=== [getCompanyDocuments] END ===\n');

    res.json(documents);
  } catch (err) {
    console.error('❌ [getCompanyDocuments] Error:', err);
    res.status(500).json({
      message: 'Failed to fetch documents',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/* =========================
   DELETE COMPANY DOCUMENT
========================= */
exports.deleteCompanyDocument = async (req, res) => {
  try {
    console.log('\n=== [deleteCompanyDocument] START ===');
    
    const companyId = req.user.id;
    const { documentId } = req.params;

    const doc = await CompanyDocuments.findOne({
      where: {
        id: documentId,
        company_id: companyId,
      },
    });

    if (!doc) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await doc.destroy();

    console.log(`[deleteCompanyDocument] ✅ Document ${documentId} deleted`);
    console.log('=== [deleteCompanyDocument] END ===\n');

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    console.error('❌ [deleteCompanyDocument] Error:', err);
    res.status(500).json({
      message: 'Failed to delete document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/* =========================
   DOWNLOAD COMPANY DOCUMENT
========================= */
exports.downloadCompanyDocument = async (req, res) => {
  try {
    console.log('\n=== [downloadCompanyDocument] START ===');
    
    const companyId = req.user.id;
    const { documentId } = req.params;

    const doc = await CompanyDocuments.findOne({
      where: {
        id: documentId,
        company_id: companyId,
      },
    });

    if (!doc || !doc.file_content) {
      console.log(`[downloadCompanyDocument] ❌ Document not found or no content`);
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log(`[downloadCompanyDocument] ✅ Serving document: ${doc.file_name}`);

    // Serve with inline disposition to open in browser
    const mimeType = doc.file_mime_type || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    res.setHeader('Content-Length', doc.file_content.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    console.log('=== [downloadCompanyDocument] END ===\n');
    
    return res.send(doc.file_content);
  } catch (err) {
    console.error('❌ [downloadCompanyDocument] Error:', err);
    res.status(500).json({
      message: 'Failed to download document',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

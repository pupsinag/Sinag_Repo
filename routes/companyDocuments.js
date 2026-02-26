/* eslint-env node */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { uploadCompanyDocument, getCompanyDocuments, deleteCompanyDocument, downloadCompanyDocument } = require('../controllers/companyDocumentsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ UPLOAD CONFIGURATION
const uploadsFolder = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsFolder)) {
  fs.mkdirSync(uploadsFolder, { recursive: true });
}

const storage = multer.memoryStorage(); // Store in memory, we'll save to DB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Accept all file types for company documents
    cb(null, true);
  },
});

// ✅ ROUTES

// Apply auth middleware to all routes
router.use(authMiddleware());

/**
 * POST /api/company-documents/upload
 * Upload a company document (MOA, agreement, etc.)
 */
router.post('/upload', upload.single('file'), uploadCompanyDocument);

/**
 * GET /api/company-documents
 * Get all company documents
 */
router.get('/', getCompanyDocuments);

/**
 * DELETE /api/company-documents/:documentId
 * Delete a company document
 */
router.delete('/:documentId', deleteCompanyDocument);

/**
 * GET /api/company-documents/download/:documentId
 * Download a company document
 */
router.get('/download/:documentId', downloadCompanyDocument);

module.exports = router;

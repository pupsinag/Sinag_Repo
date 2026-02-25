const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateInternSubmittedDocuments, getInternSubmittedDocuments, downloadSubmittedDocument } = require('../controllers/internSubmittedDocumentsController');

/* =============================
   INTERNS SUBMITTED DOCUMENTS
   PDF REPORT
============================== */

router.post('/intern-documents', authMiddleware(['adviser', 'coordinator']), generateInternSubmittedDocuments);

/* =============================
   INTERNS SUBMITTED DOCUMENTS
   JSON - FOR TABLE VIEW
============================== */

router.post('/intern-documents-json', authMiddleware(['adviser', 'coordinator']), getInternSubmittedDocuments);

/* =============================
   DOWNLOAD INDIVIDUAL SUBMITTED DOCUMENT
============================== */

router.get('/intern-documents/download/:internId/:documentType', authMiddleware(['adviser', 'coordinator', 'admin']), downloadSubmittedDocument);

module.exports = router;

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateInternSubmittedDocuments, getInternSubmittedDocuments } = require('../controllers/internSubmittedDocumentsController');

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

module.exports = router;

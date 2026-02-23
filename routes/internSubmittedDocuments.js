const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateInternSubmittedDocuments } = require('../controllers/internSubmittedDocumentsController');

/* =============================
   INTERNS SUBMITTED DOCUMENTS
   PDF REPORT
============================== */

router.post('/intern-documents', authMiddleware(['adviser', 'coordinator']), generateInternSubmittedDocuments);

module.exports = router;

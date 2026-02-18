const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { generateInternSubmittedDocuments } = require('../controllers/internSubmittedDocumentsController');

/* =============================
   INTERNS SUBMITTED DOCUMENTS
   PDF REPORT
============================== */

router.post('/intern-documents', authMiddleware(), generateInternSubmittedDocuments);

module.exports = router;

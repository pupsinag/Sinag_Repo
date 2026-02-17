/* eslint-env node */
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Controllers
const { uploadInternDoc, getInternDocuments } = require('../controllers/internDocsController');

const consentController = require('../controllers/consentController');
const notarizedAgreementController = require('../controllers/notarizedAgreementController');

/* =========================
   PROTECTED ROUTES
========================= */
router.use(authMiddleware());

/* =========================
   INTERN DOCUMENT ROUTES
========================= */

// Upload manually uploaded intern documents (Resume, COR, etc.)
router.post(
  '/intern-docs/upload',
  upload.single('file'), // 🔥 MUST MATCH frontend FormData.append('file')
  uploadInternDoc,
);

// Get all document statuses for logged-in intern
router.get('/intern-docs/me', getInternDocuments);

/* =========================
   CONSENT FORM ROUTES
========================= */

// Get auto-filled consent form data
router.get('/consent-data', consentController.getConsentData);

// Save consent form + generate PDF
router.post('/consent-save', consentController.saveConsent);

/* =========================
   NOTARIZED AGREEMENT ROUTES
========================= */

// Get auto-filled notarized agreement data
router.get('/notarized-agreement-data', notarizedAgreementController.getAgreementData);

// Save notarized agreement + generate PDF
router.post('/notarized-agreement-save', notarizedAgreementController.saveAgreement);

module.exports = router;

/* eslint-env node */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const internController = require('../controllers/internController'); // ✅ USED
const internDocsController = require('../controllers/internDocsController');
const consentController = require('../controllers/consentController');
const companyDashboardController = require('../controllers/companyDashboardController');

const authMiddleware = require('../middleware/authMiddleware');
const { ensureDBConnection } = require('../middleware/dbHealthCheck');
const upload = require('../middleware/upload');

console.log('✅ Auth routes loaded');

/* =========================
   PUBLIC ROUTES
========================= */
router.get('/test', (req, res) => {
  res.json({ message: 'auth route working' });
});

// Apply DB health check to critical endpoints
router.post('/signup', ensureDBConnection, authController.signup);
router.post('/login', ensureDBConnection, authController.login);

/* =========================
   PROTECTED ROUTES
========================= */
router.use(authMiddleware(['superadmin', 'coordinator', 'adviser', 'intern', 'company']));
router.use(ensureDBConnection);

/* =========================
   USER PROFILE
========================= */
router.get('/me', authController.me);
router.put('/profile', authController.updateProfile);
router.put('/change-password', authController.changePassword);

/* =========================
   COORDINATORS (SUPERADMIN)
========================= */
router.post('/addCoordinator', authMiddleware(['superadmin']), authController.addCoordinator);

/* =========================
   ADVISERS (COORDINATOR)
========================= */
router.get('/advisers', authController.getAdvisers);

router.post('/addAdviser', authMiddleware(['coordinator']), authController.addAdviser);

router.put('/advisers/:id', authMiddleware(['coordinator']), authController.updateAdviser);

router.delete('/advisers/:id', authMiddleware(['coordinator']), authController.deleteAdviser);

/* =========================
   INTERNS
========================= */
router.post('/addIntern', authMiddleware(['adviser']), authController.addIntern);

/**
 * ✅ ADVISER / COORDINATOR
 * ✅ USED BY INTERN DOCUMENTS TABLE
 * (FIXES EMPTY TABLE ISSUE)
 */
router.get('/interns', authMiddleware(['adviser', 'coordinator']), internController.getInternsForAdviser);

router.put('/interns/:id', authMiddleware(['adviser', 'coordinator']), authController.updateIntern);

router.put('/interns/:id/status', authMiddleware(['adviser', 'coordinator']), authController.updateInternStatus);

router.put('/interns/:id/assign-hte', authMiddleware(['adviser', 'coordinator']), authController.assignHTE);

router.delete('/interns/:id', authMiddleware(['coordinator']), authController.deleteIntern);

/* =========================
   CONSENT DATA
========================= */
router.get('/consent-data', authMiddleware(['intern']), consentController.getConsentData);

router.post('/consent-save', authMiddleware(['intern']), consentController.saveConsent);

/* =========================
   INTERN DOCUMENTS
========================= */

// Custom middleware to handle multer errors
const handleUploadError = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({
        message: 'File upload failed: ' + (err.message || 'Unknown error'),
      });
    }
    next();
  });
};

// INTERN – upload / update document
router.post(
  '/intern-docs/upload',
  authMiddleware(['intern']),
  (req, res, next) => {
    // Validate authentication before multer
    console.log('[ROUTE] /intern-docs/upload - user:', req.user?.id);
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'You must be logged in as an intern to upload documents' });
    }
    next();
  },
  handleUploadError,
  internDocsController.uploadInternDoc,
);

// INTERN – view own checklist
router.get('/intern-docs/me', authMiddleware(['intern']), internDocsController.getInternDocuments);

// INTERN – delete document
router.delete('/intern-docs/:column', authMiddleware(['intern']), internDocsController.deleteInternDoc);

/* =========================
   COMPANY / HTE
========================= */

// Custom middleware for MOA file uploads
const handleMOAUploadError = (req, res, next) => {
  upload.single('moaFile')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer MOA error:', err.message);
      return res.status(400).json({
        message: 'File upload failed: ' + (err.message || 'Unknown error'),
      });
    }
    next();
  });
};

router.post('/addCompany', authMiddleware(['coordinator']), handleMOAUploadError, authController.addCompany);

router.get('/HTE', authController.getHTE);

router.put('/HTE/:id', authMiddleware(['coordinator']), handleMOAUploadError, authController.updateCompany);

router.delete('/HTE/:id', authMiddleware(['coordinator']), authController.deleteHTE);

/* =========================
   COMPANY DASHBOARD (COMPANY ROLE)
========================= */

// Company profile
router.get('/company/me', authMiddleware(['company']), companyDashboardController.getMyCompany);

// Update company profile
router.put('/company/profile', authMiddleware(['company']), companyDashboardController.updateMyCompany);

// Company interns
router.get('/company/interns', authMiddleware(['company']), companyDashboardController.getCompanyInterns);

// Upload / update MOA
router.put('/company/moa', authMiddleware(['company']), handleMOAUploadError, companyDashboardController.uploadMoa);

// View / download MOA (Intern or Company)
router.get('/company/moa', authMiddleware(['intern', 'company']), companyDashboardController.getMoa);

module.exports = router;

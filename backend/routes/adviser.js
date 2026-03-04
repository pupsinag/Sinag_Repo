const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const adviserController = require('../controllers/adviserController');

/* =========================
   ROUTES
========================= */

// INTERN – get assigned adviser
router.get('/my-adviser', authMiddleware(['intern']), adviserController.getAdviserForStudent);

// ADVISER – get handled programs
router.get('/my-programs', authMiddleware(['adviser']), adviserController.getProgramsForAdviser);

// ADVISER – get interns matching program and yearSection
router.get('/matching-interns', authMiddleware(['adviser']), adviserController.getMatchingInterns);

// COORDINATOR – update adviser details
router.put('/:id', authMiddleware(['coordinator']), adviserController.updateAdviser);

module.exports = router;

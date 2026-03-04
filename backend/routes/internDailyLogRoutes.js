const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // Use memory storage (database-only)
const {
  createDailyLog,
  getDailyLogs,
  getInternDailyLogsForAdviser,
  approveLogByAdviser,
  getCompanyInternDailyLogs,
  approveLogBySupervisor,
  updateDailyLog,
  deleteDailyLog,
} = require('../controllers/internDailyLogController');

/* =========================
   ERROR HANDLER FOR MULTER
========================= */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    console.error('❌ MULTER ERROR:', err.code);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 5MB limit' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field' });
    }
  } else if (err) {
    console.error('❌ FILE FILTER ERROR:', err.message);
    return res.status(400).json({ message: err.message });
  }
  next();
};

/* =========================
   ROUTES
========================= */

// INTERN: Create daily log with photos (optional • max 5)
router.post(
  '/daily-log',
  authMiddleware('intern'),
  (req, res, next) => {
    upload.array('photos', 5)(req, res, (err) => {
      handleMulterError(err, req, res, next);
    });
  },
  createDailyLog,
);

// INTERN: Get own daily logs
router.get('/daily-logs', authMiddleware('intern'), getDailyLogs);

// ADVISER: Get specific intern's daily logs
router.get('/daily-logs/:id', authMiddleware('adviser'), getInternDailyLogsForAdviser);

// ADVISER: Approve daily log by adviser
router.put('/daily-logs/:reportId/adviser-approve', authMiddleware('adviser'), approveLogByAdviser);

// SUPERVISOR: Get intern daily logs for their company
router.get('/company/daily-logs/:internId', authMiddleware('company'), getCompanyInternDailyLogs);

// SUPERVISOR: Approve daily log by supervisor
router.put('/daily-logs/:reportId/supervisor-approve', authMiddleware('company'), approveLogBySupervisor);

// INTERN: Update daily log
router.put(
  '/daily-logs/:id',
  authMiddleware('intern'),
  (req, res, next) => {
    upload.array('photos', 5)(req, res, (err) => {
      handleMulterError(err, req, res, next);
    });
  },
  updateDailyLog,
);

// INTERN: Delete daily log
router.delete('/daily-logs/:id', authMiddleware('intern'), deleteDailyLog);

module.exports = router;

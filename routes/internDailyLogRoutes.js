const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Lightweight request tracer for this router (helps confirm route hits)
router.use((req, res, next) => {
  console.log(`[ROUTE TRACE] internDailyLogRoutes -> ${req.method} ${req.originalUrl}`);
  next();
});

const authMiddleware = require('../middleware/authMiddleware');
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
   ENSURE UPLOADS FOLDER EXISTS
========================= */
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

/* =========================
   MULTER CONFIGURATION
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Saving file to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // filename: photo_USERID_TIMESTAMP.ext
    const ext = path.extname(file.originalname);
    const uniqueName = `photo_${req.user.id}_${Date.now()}${ext}`;
    console.log('📄 Generated filename:', uniqueName);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  console.log('🔍 File received - mimetype:', file.mimetype, 'originalname:', file.originalname);

  // Only accept image files
  if (file.mimetype.startsWith('image/')) {
    console.log('✅ File accepted - is image');
    cb(null, true);
  } else {
    console.log('❌ File rejected - not an image');
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/* =========================
   ERROR HANDLER FOR MULTER
========================= */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
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

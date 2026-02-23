const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname);

      // 🔹 CASE 1: MOA upload (company)
      if (file.fieldname === 'moaFile' && req.body?.name) {
        const companyFirstWord = req.body.name
          .trim()
          .split(/\s+/)[0]
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '');

        const filename = `${companyFirstWord}_MOA${ext}`;
        console.log('✅ [MULTER] MOA filename:', filename);
        return cb(null, filename);
      }

      // 🔹 CASE 2: Intern documents (default)
      // Safely get lastName from req.user
      let lastName = 'UNKNOWN';
      if (req.user && req.user.lastName && typeof req.user.lastName === 'string') {
        lastName = req.user.lastName.trim();
      }
      
      // Fallback to firstName if lastName doesn't exist
      if (lastName === 'UNKNOWN' && req.user && req.user.firstName && typeof req.user.firstName === 'string') {
        lastName = req.user.firstName.trim();
      }

      lastName = lastName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

      const originalName = path
        .basename(file.originalname, ext)
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');

      const filename = `${lastName}_${originalName}${ext}`;
      console.log('✅ [MULTER] Intern filename:', filename, 'User:', req.user?.id);
      cb(null, filename);
    } catch (err) {
      console.error('❌ [MULTER FILENAME ERROR]:', err.message);
      cb(err);
    }
  },
});

// Apply size limits and file type filtering
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed document types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    // Allow MOA with any valid mime type
    if (file.fieldname === 'moaFile') {
      return cb(null, true);
    }

    // For intern docs, validate mime type
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn(`⚠️ [MULTER] Rejected file type: ${file.mimetype}`);
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

module.exports = upload;

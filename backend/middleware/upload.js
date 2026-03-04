const multer = require('multer');

// Use memory storage to store files in buffer (no disk writes)
const storage = multer.memoryStorage();

// Apply size limits and file type filtering
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed document types
    const allowedDocMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];

    // Allowed photo mime types (for daily logs)
    const allowedPhotoMimes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
    ];

    // Allow MOA with any valid mime type
    if (file.fieldname === 'moaFile') {
      console.log('✅ [MULTER] MOA file received:', file.originalname, 'Size:', file.size);
      return cb(null, true);
    }

    // For photos field - validate against photo mimes
    if (file.fieldname === 'photos') {
      if (allowedPhotoMimes.includes(file.mimetype)) {
        console.log('✅ [MULTER] Photo file received:', file.originalname, 'MIME:', file.mimetype);
        return cb(null, true);
      } else {
        console.warn(`⚠️ [MULTER] Rejected photo type: ${file.mimetype}`);
        return cb(new Error(`Photo type ${file.mimetype} is not allowed`));
      }
    }

    // For other documents, validate mime type
    if (allowedDocMimes.includes(file.mimetype)) {
      console.log('✅ [MULTER] Document file received:', file.originalname);
      cb(null, true);
    } else {
      console.warn(`⚠️ [MULTER] Rejected file type: ${file.mimetype}`);
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

module.exports = upload;

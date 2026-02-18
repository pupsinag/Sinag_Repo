const multer = require('multer');
const path = require('path');

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

        return cb(null, `${companyFirstWord}_MOA${ext}`);
      }

      // 🔹 CASE 2: Intern documents (default)
      const lastName = (req.user?.lastName || 'UNKNOWN').toUpperCase().replace(/\s+/g, '_');

      const originalName = path
        .basename(file.originalname, ext)
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_]/g, '');

      cb(null, `${lastName}_${originalName}${ext}`);
    } catch (err) {
      cb(err);
    }
  },
});

module.exports = multer({ storage });

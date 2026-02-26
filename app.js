/* eslint-env node */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// =========================
// INIT EXPRESS (BEFORE models)
// =========================
const app = express();
const PORT = process.env.PORT || 5000;

// =========================
// GLOBAL MIDDLEWARES
// =========================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // ✅ Allow CORS for static files
  }),
);

// ✅ CORS Configuration
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Handle preflight requests for all routes
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// =========================
// STATIC FILES - UPLOADS (BEFORE other routes)
// Database-first serving for intern documents
// =========================
app.use('/uploads', async (req, res, next) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    // Extract filename from URL
    const filename = req.path.replace(/^\//, '');  // Remove leading slash
    
    if (!filename) {
      return next();  // Let static middleware handle
    }

    console.log('[/uploads middleware] Requested filename:', filename);

    // Try to find file in database first
    const { InternDocuments } = require('./models');
    
    const doc = await InternDocuments.findOne({
      where: { file_path: filename },
    });

    if (doc && doc.file_content && doc.file_content.length > 0) {
      console.log('[/uploads middleware] ✅ Found in database:', filename);
      
      // Always serve with Content-Disposition: inline to prevent downloads
      // For files that can't be displayed inline (like .docx), provide a download link instead
      const isPDF = filename.toLowerCase().endsWith('.pdf');
      const isImage = filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i);
      const isDocumentFile = filename.toLowerCase().match(/\.(docx|doc|xlsx|xls|txt|ppt|pptx)$/i);
      
      if (isPDF || isImage || isDocumentFile) {
        // Serve as HTML page (with embedded content or link)
        const base64Content = doc.file_content.toString('base64');
        const mimeType = doc.file_mime_type || 'application/octet-stream';
        
        let viewerHTML;
        
        if (isPDF) {
          // PDF can be embedded
          viewerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${doc.file_name}</title>
              <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .toolbar { background: #333; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 15px; }
                .toolbar span { flex: 1; font-weight: bold; }
                .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .toolbar button:hover { background: #0052a3; }
                #viewer { width: 100%; height: calc(100vh - 50px); }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <span>${doc.file_name}</span>
                <button onclick="downloadFile()">⬇️ Download</button>
              </div>
              <embed id="viewer" src="data:application/pdf;base64,${base64Content}" type="application/pdf" />
              <script>
                function downloadFile() {
                  const link = document.createElement('a');
                  link.href = 'data:application/pdf;base64,${base64Content}';
                  link.download = '${doc.file_name}';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              </script>
            </body>
            </html>
          `;
        } else if (isImage) {
          // Image can be embedded
          viewerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${doc.file_name}</title>
              <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f0f0f0; }
                .toolbar { background: #333; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 15px; }
                .toolbar span { flex: 1; font-weight: bold; }
                .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .toolbar button:hover { background: #0052a3; }
                .container { padding: 20px; text-align: center; }
                img { max-width: 100%; max-height: 80vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <span>${doc.file_name}</span>
                <button onclick="downloadFile()">⬇️ Download</button>
              </div>
              <div class="container">
                <img src="data:${mimeType};base64,${base64Content}" />
              </div>
              <script>
                function downloadFile() {
                  const link = document.createElement('a');
                  link.href = 'data:${mimeType};base64,${base64Content}';
                  link.download = '${doc.file_name}';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              </script>
            </body>
            </html>
          `;
        } else if (isDocumentFile) {
          // Document files (Word, Excel, etc) - show preview link and download button
          viewerHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${doc.file_name}</title>
              <style>
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
                .toolbar { background: #333; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 15px; }
                .toolbar span { flex: 1; font-weight: bold; }
                .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
                .toolbar button:hover { background: #0052a3; }
                .container { padding: 40px 20px; text-align: center; max-width: 600px; margin: 0 auto; }
                .file-info { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .icon { font-size: 48px; margin-bottom: 20px; }
                h1 { margin: 0 0 10px 0; color: #333; }
                p { color: #666; margin: 0 0 30px 0; }
                .button-group { display: flex; gap: 10px; justify-content: center; }
                a, button { padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; }
                .btn-primary { background: #0066cc; color: white; }
                .btn-primary:hover { background: #0052a3; }
                .btn-secondary { background: #e0e0e0; color: #333; }
                .btn-secondary:hover { background: #d0d0d0; }
              </style>
            </head>
            <body>
              <div class="toolbar">
                <span>${doc.file_name}</span>
                <button onclick="downloadFile()">⬇️ Download</button>
              </div>
              <div class="container">
                <div class="file-info">
                  <div class="icon">📄</div>
                  <h1>${doc.file_name}</h1>
                  <p>This document cannot be previewed in the browser.</p>
                  <p>Click Download to view the file on your computer.</p>
                  <div class="button-group">
                    <button class="btn-primary" onclick="downloadFile()">⬇️ Download</button>
                    <button class="btn-secondary" onclick="window.history.back()">← Back</button>
                  </div>
                </div>
              </div>
              <script>
                function downloadFile() {
                  const link = document.createElement('a');
                  link.href = 'data:${mimeType};base64,${base64Content}';
                  link.download = '${doc.file_name}';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              </script>
            </body>
            </html>
          `;
        }
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        
        return res.send(viewerHTML);
      }
      
      // For other file types, serve raw with inline
      const mimeType = doc.file_mime_type || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Length', doc.file_content.length);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      return res.send(doc.file_content);
    }

    console.log('[/uploads middleware] Not in database, trying filesystem...');
    // Not in database, fall through to static file serving
    next();
  } catch (err) {
    console.error('[/uploads middleware] Error:', err.message);
    next();  // Fall through to static on error
  }
});

// Fallback: Custom middleware for filesystem files (PDF/images/documents as HTML viewers)
app.use('/uploads', async (req, res, next) => {
  try {
    const filename = req.path.replace(/^\//, '');
    if (!filename) return next();
    
    const isPDF = filename.toLowerCase().endsWith('.pdf');
    const isImage = filename.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isDocumentFile = filename.toLowerCase().match(/\.(docx|doc|xlsx|xls|txt|ppt|pptx)$/i);
    
    if (!isPDF && !isImage && !isDocumentFile) {
      // Not a supported file type, let express.static handle it
      return next();
    }
    
    // Try to read file from filesystem
    const fs = require('fs');
    const filePath = path.join(__dirname, 'uploads', filename);
    
    try {
      const fileContent = fs.readFileSync(filePath);
      const base64Content = fileContent.toString('base64');
      
      let mimeType = 'application/octet-stream';
      if (isPDF) {
        mimeType = 'application/pdf';
      } else if (filename.match(/\.jpg$/i) || filename.match(/\.jpeg$/i)) {
        mimeType = 'image/jpeg';
      } else if (filename.match(/\.png$/i)) {
        mimeType = 'image/png';
      } else if (filename.match(/\.gif$/i)) {
        mimeType = 'image/gif';
      } else if (filename.match(/\.webp$/i)) {
        mimeType = 'image/webp';
      } else if (filename.match(/\.docx$/i)) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (filename.match(/\.doc$/i)) {
        mimeType = 'application/msword';
      } else if (filename.match(/\.xlsx$/i)) {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (filename.match(/\.xls$/i)) {
        mimeType = 'application/vnd.ms-excel';
      } else if (filename.match(/\.txt$/i)) {
        mimeType = 'text/plain';
      }
      
      let viewerHTML;
      
      if (isPDF) {
        viewerHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename}</title>
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
              .toolbar { background: #333; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 15px; }
              .toolbar span { flex: 1; font-weight: bold; }
              .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
              .toolbar button:hover { background: #0052a3; }
              #viewer { width: 100%; height: calc(100vh - 50px); }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <span>${filename}</span>
              <button onclick="downloadFile()">⬇️ Download</button>
            </div>
            <embed id="viewer" src="data:application/pdf;base64,${base64Content}" type="application/pdf" />
            <script>
              function downloadFile() {
                const link = document.createElement('a');
                link.href = 'data:application/pdf;base64,${base64Content}';
                link.download = '${filename}';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            </script>
          </body>
          </html>
        `;
      } else if (isImage) {
        viewerHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename}</title>
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f0f0f0; }
              .toolbar { background: #333; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 15px; }
              .toolbar span { flex: 1; font-weight: bold; }
              .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
              .toolbar button:hover { background: #0052a3; }
              .container { padding: 20px; text-align: center; }
              img { max-width: 100%; max-height: 80vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <span>${filename}</span>
              <button onclick="downloadFile()">⬇️ Download</button>
            </div>
            <div class="container">
              <img src="data:${mimeType};base64,${base64Content}" />
            </div>
            <script>
              function downloadFile() {
                const link = document.createElement('a');
                link.href = 'data:${mimeType};base64,${base64Content}';
                link.download = '${filename}';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            </script>
          </body>
          </html>
        `;
      } else if (isDocumentFile) {
        viewerHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${filename}</title>
            <style>
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
              .toolbar { background: #333; color: white; padding: 12px 20px; display: flex; align-items: center; gap: 15px; }
              .toolbar span { flex: 1; font-weight: bold; }
              .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
              .toolbar button:hover { background: #0052a3; }
              .container { padding: 40px 20px; text-align: center; max-width: 600px; margin: 0 auto; }
              .file-info { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { margin: 0 0 10px 0; color: #333; }
              p { color: #666; margin: 0 0 30px 0; }
              .button-group { display: flex; gap: 10px; justify-content: center; }
              button { padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; }
              .btn-primary { background: #0066cc; color: white; }
              .btn-primary:hover { background: #0052a3; }
              .btn-secondary { background: #e0e0e0; color: #333; }
              .btn-secondary:hover { background: #d0d0d0; }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <span>${filename}</span>
              <button onclick="downloadFile()">⬇️ Download</button>
            </div>
            <div class="container">
              <div class="file-info">
                <div class="icon">📄</div>
                <h1>${filename}</h1>
                <p>This document cannot be previewed in the browser.</p>
                <p>Click Download to view the file on your computer.</p>
                <div class="button-group">
                  <button class="btn-primary" onclick="downloadFile()">⬇️ Download</button>
                  <button class="btn-secondary" onclick="window.history.back()">← Back</button>
                </div>
              </div>
            </div>
            <script>
              function downloadFile() {
                const link = document.createElement('a');
                link.href = 'data:${mimeType};base64,${base64Content}';
                link.download = '${filename}';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            </script>
          </body>
          </html>
        `;
      }
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return res.send(viewerHTML);
    } catch (fileErr) {
      // File not found in filesystem, let express.static handle 404
      return next();
    }
  } catch (err) {
    console.error('[/uploads fallback] Error:', err.message);
    next();
  }
});

// Express.static fallback for other file types
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', 'inline');
    },
  }),
);

// =========================
// HELPER FUNCTION TO SAFELY LOAD ROUTES
// =========================
const loadRoute = (filePath, routeName) => {
  try {
    const route = require(filePath);
    // Accept both functions and objects (Express routers)
    if (!route || (typeof route !== 'function' && typeof route !== 'object')) {
      console.warn(`⚠️ WARNING: Route "${routeName}" is not a valid express router. File: ${filePath}`);
      return null;
    }
    return route;
  } catch (err) {
    console.warn(`⚠️ WARNING: Failed to load route "${routeName}". File: ${filePath}. Error: ${err.message}`);
    return null;
  }
};

// =========================
// ROUTES
// =========================
const authRoute = loadRoute(path.join(__dirname, 'routes', 'auth.js'), 'auth');
if (authRoute) {
  console.log('[ROUTE] /api/auth loaded and registered');
  app.use('/api/auth', authRoute);
}

const documentsRoute = loadRoute('./routes/documents', 'documents');
if (documentsRoute) app.use('/api/documents', documentsRoute);

const dashboardRoute = loadRoute(path.join(__dirname, 'routes', 'dashboard.js'), 'dashboard');
if (dashboardRoute) {
  console.log('[ROUTE] /api/dashboard loaded and registered');
  app.use('/api/dashboard', dashboardRoute);
}

const internEvaluationsRoute = loadRoute('./routes/InternEvaluations', 'InternEvaluations');
if (internEvaluationsRoute) app.use('/api/intern-evaluations', internEvaluationsRoute);

const adviserRoute = loadRoute('./routes/adviser', 'adviser');
if (adviserRoute) app.use('/api/adviser', adviserRoute);

const internInDashboardRoute = loadRoute('./routes/internInDashboardRoutes', 'internInDashboardRoutes');
if (internInDashboardRoute) app.use('/api/adviser', internInDashboardRoute);

const internListRoute = loadRoute('./routes/internList', 'internList');
if (internListRoute) app.use('/api/reports', internListRoute);

const hteListRoute = loadRoute('./routes/hteList', 'hteList');
if (hteListRoute) app.use('/api/reports', hteListRoute);

const internAssignedRoute = loadRoute('./routes/internAssignedToHTE', 'internAssignedToHTE');
if (internAssignedRoute) app.use('/api/reports', internAssignedRoute);

const internSubmittedRoute = loadRoute(path.join(__dirname, 'routes', 'internSubmittedDocuments.js'), 'internSubmittedDocuments');
if (internSubmittedRoute) {
  console.log('[ROUTE] /api/reports/intern-documents loaded and registered');
  app.use('/api/reports', internSubmittedRoute);
} else {
  console.error('[ERROR] Failed to load internSubmittedDocuments route!');
}

const adviserListRoute = loadRoute('./routes/adviserList', 'adviserList');
if (adviserListRoute) app.use('/api/reports', adviserListRoute);

const internEvalReportRoute = loadRoute('./routes/internEvaluationReport', 'internEvaluationReport');
if (internEvalReportRoute) app.use('/api/reports', internEvalReportRoute);

const reportsRoute = loadRoute(path.join(__dirname, 'routes', 'reports.js'), 'reports');
if (reportsRoute) {
  console.log('[ROUTE] /api/reports loaded and registered');
  app.use('/api/reports', reportsRoute);
} else {
  console.warn('[ROUTE] /api/reports NOT loaded!');
}

const forgotPasswordRoute = loadRoute('./routes/forgotPasswordRoutes', 'forgotPasswordRoutes');
if (forgotPasswordRoute) app.use('/api/forgot-password', forgotPasswordRoute);

const hteEvaluationsRoute = loadRoute('./routes/hteEvaluations', 'hteEvaluations');
if (hteEvaluationsRoute) app.use('/api/hte-evaluations', hteEvaluationsRoute);

const supervisorEvaluationsRouter = require('./routes/SupervisorEvaluations');
app.use('/api/supervisor-evaluations', supervisorEvaluationsRouter);

const supervisorsRoute = loadRoute('./routes/supervisors', 'supervisors');
if (supervisorsRoute) app.use('/api/supervisors', supervisorsRoute);

const internAssignmentRoute = loadRoute('./routes/internAssignment', 'internAssignment');
if (internAssignmentRoute) app.use('/api/interns', internAssignmentRoute);

const evaluationSettingsRoute = loadRoute('./routes/evaluationSettings', 'evaluationSettings');
if (evaluationSettingsRoute) {
  console.log('[ROUTE] /api/evaluation loaded and registered');
  app.use('/api/evaluation', evaluationSettingsRoute);
} else {
  console.warn('[ROUTE] /api/evaluation NOT loaded!');
}

// =========================
// COMPANY DOCUMENTS ROUTE
// =========================
const companyDocumentsRoute = loadRoute('./routes/companyDocuments', 'companyDocuments');
if (companyDocumentsRoute) {
  console.log('[ROUTE] /api/company-documents loaded and registered');
  app.use('/api/company-documents', companyDocumentsRoute);
} else {
  console.warn('[ROUTE] /api/company-documents NOT loaded!');
}

// =========================
// DAILY LOG ROUTE
// =========================
const internDailyLogRoutes = loadRoute(
  path.join(__dirname, 'routes', 'internDailyLogRoutes.js'),
  'internDailyLogRoutes',
);
if (internDailyLogRoutes) {
  app.use('/api', internDailyLogRoutes);
  console.log('[ROUTE] /api - internDailyLogRoutes loaded and registered');
} else {
  console.warn('[ROUTE] /api - internDailyLogRoutes NOT loaded');
}

// =========================
// SERVE FRONTEND (PRODUCTION)
// =========================
const publicPath = path.join(__dirname, 'public/dist');
console.log(`📁 Checking frontend at: ${publicPath}`);

// Serve static files from the built frontend
app.use(express.static(publicPath));

// ✅ SPA Fallback - Serve index.html for all non-API routes
app.get('/*', (req, res) => {
  // Don't redirect API calls
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }

  // Serve index.html for React Router
  const indexPath = path.join(publicPath, 'index.html');
  if (indexPath) {
    return res.sendFile(indexPath);
  }

  // Fallback health check
  res.json({ message: 'pup-sinag backend running' });
});

// =========================
// ERROR HANDLER (LAST)
// =========================
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// =========================
// LOAD DATABASE + MODELS (AFTER routes defined)
// =========================
const db = require('./models');
const { sequelize } = db;

// =========================
// CONNECTION POOL MANAGEMENT
// =========================
// Ensure connections are validated before use
app.use(async (req, res, next) => {
  try {
    // Test and restore connection if needed
    if (!sequelize.authenticate) {
      await sequelize.authenticate();
    }
    next();
  } catch (error) {
    console.warn('⚠️ Database connection lost, attempting to reconnect...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database reconnected successfully');
      next();
    } catch (reconnectError) {
      console.error('❌ Failed to reconnect to database:', reconnectError);
      res.status(503).json({ message: 'Database connection unavailable' });
    }
  }
});

// =========================
// START SERVER
// =========================
console.log('🚀 Starting backend...');

// =========================
// START SERVER (ALWAYS)
// =========================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend listening on port ${PORT}`);
});

// =========================
// CONNECT DATABASE (ASYNC)
// =========================
const addMissingColumns = require('./utils/addMissingColumns');

sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connected');
    return sequelize.sync();
  })
  .then(() => {
    console.log('✅ Models synced');
    return addMissingColumns();
  })
  .then(() => {
    console.log('✅ Database schema updated');
    
    // Setup connection pool health check every 5 minutes
    setInterval(async () => {
      try {
        await sequelize.authenticate();
        console.log('✅ Connection pool health check passed');
      } catch (error) {
        console.warn('⚠️ Connection pool health check failed:', error.message);
        // Attempt to recreate connection
        try {
          await sequelize.close();
          await sequelize.authenticate();
          console.log('✅ Connection pool recovered');
        } catch (recoveryError) {
          console.error('❌ Failed to recover connection pool:', recoveryError);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
  });


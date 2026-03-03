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

// ✅ CORS Configuration - Allow production domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://pupsinag.com',
  'http://pupsinag.com',
  process.env.CORS_ORIGIN // From .env
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
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
// HEALTH CHECK (NO DATABASE REQUIRED)
// =========================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

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
    try {
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
                </style>
              </head>
              <body>
                <div class="toolbar">
                  <span>${doc.file_name}</span>
                  <button onclick="downloadFile()">⬇️ Download</button>
                  <button onclick="window.history.back()">← Back</button>
                </div>
                <embed src="data:${mimeType};base64,${base64Content}" type="${mimeType}" width="100%" height="100%">
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
          } else if (isImage) {
            // Image can be embedded
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
                  .container { display: flex; justify-content: center; align-items: center; min-height: calc(100vh - 50px); }
                  .container img { max-width: 90%; max-height: 90vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <div class="toolbar">
                  <span>${doc.file_name}</span>
                  <button onclick="downloadFile()">⬇️ Download</button>
                  <button onclick="window.history.back()">← Back</button>
                </div>
                <div class="container">
                  <img src="data:${mimeType};base64,${base64Content}" alt="${doc.file_name}">
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
          } else {
            // Document file - can't preview inline
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
                </style>
              </head>
              <body>
                <div class="toolbar">
                  <span>${doc.file_name}</span>
                  <button onclick="downloadFile()">⬇️ Download</button>
                  <button onclick="window.history.back()">← Back</button>
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
    } catch (dbErr) {
      console.log('[/uploads middleware] Database lookup failed, trying filesystem:', dbErr.message);
    }
    
    console.log('[/uploads middleware] Not in database, falling back to express.static...');
    // Not in database, fall through to static file serving
    next();
  } catch (err) {
    console.error('[/uploads middleware] Error:', err.message);
    next();  // Fall through to static on error
  }
});

// Database-first serving for intern documents (removed duplicate code - see loop)
// Fallback: Plain express.static for files not in database
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
// HEALTH CHECK ENDPOINT (For monitoring database connection)
// =========================
app.get('/api/health', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    res.status(200).json({
      status: 'ok',
      message: 'Database connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

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
// ERROR HANDLER (LAST - BEFORE DATABASE INIT)
// =========================
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// =========================
// START SERVER (ASYNC - WAIT FOR DATABASE)
// =========================
console.log('🚀 Starting backend...');

const sequelize = require('./config/database');
const addMissingColumns = require('./utils/addMissingColumns');
let db = null;

async function startServer() {
  let dbReady = false;
  
  try {
    console.log('\n📊 Database Configuration:');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    console.log(`   User: ${process.env.DB_USER}`);
    
    // CRITICAL: Authenticate database FIRST
    console.log('\n🔄 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database authenticated successfully');
    dbReady = true;
    
    // NOW load models (after database is ready)
    console.log('\n📚 Loading models...');
    db = require('./models');
    console.log('✅ Models loaded');
    
    // Sync database schema - but don't fail if sync fails
    console.log('\n🔄 Syncing models with database...');
    try {
      await sequelize.sync({ alter: false });
      console.log('✅ Models synced successfully');
    } catch (syncErr) {
      console.warn('⚠️ Model sync warning (continuing anyway):', syncErr.message);
      // Don't exit - server can still function with unsyncced models
    }
    
    // Add missing columns - but don't fail if this fails
    console.log('\n🔧 Checking for missing columns...');
    try {
      await addMissingColumns();
      console.log('✅ Database schema verified');
    } catch (colErr) {
      console.warn('⚠️ Column sync warning (continuing anyway):', colErr.message);
      // Don't exit - server can still function
    }
    
  } catch (dbErr) {
    // Database failed, but continue with server startup
    console.warn('\n⚠️  Database connection failed at startup:');
    console.warn('   Error:', dbErr.message);
    if (dbErr.original) {
      console.warn('   MySQL Error:', dbErr.original.message);
    }
    console.warn('\n💡 Server will start anyway - database-dependent features may fail\n');
    dbReady = false;
  }
  
  try {
    // NOW start the server - regardless of database status
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ BACKEND READY: http://localhost:${PORT}`);
      if (dbReady) {
        console.log('✅ Database connected and models synced');
      } else {
        console.log('⚠️  Database not connected (will retry)');
      }
      console.log('✅ Frontend served from public/dist');
      console.log('✅ Health check available at /health\n');
    });
    
    // Handle server errors
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      // Don't exit, try to recover
    });
    
    // CRITICAL: Keep-alive ping - prevents MySQL idle timeout
    setInterval(async () => {
      if (!dbReady) {
        // Try to reconnect
        try {
          await sequelize.authenticate();
          dbReady = true;
          console.log('✅ Database reconnected via keep-alive');
        } catch (e) {
          // Still not connected
        }
      } else {
        // Keep the connection alive
        try {
          await sequelize.authenticate();
        } catch (error) {
          console.warn('⚠️ Keep-alive ping failed, attempting reconnect...');
          try {
            await sequelize.close();
            await sequelize.authenticate();
            console.log('✅ Database reconnected');
            dbReady = true;
          } catch (recoveryError) {
            console.error('❌ Failed to recover database:', recoveryError.message);
            dbReady = false;
          }
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
  } catch (serverErr) {
    console.error('\n❌ FAILED TO START SERVER\n');
    console.error('='.repeat(60));
    console.error('Error Type:', serverErr.constructor.name);
    console.error('Error Message:', serverErr.message);
    console.error('Stack Trace:', serverErr.stack);
    console.error('='.repeat(60));
    process.exit(1);
  }
}


// Start the server
startServer();


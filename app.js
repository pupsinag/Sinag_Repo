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
// =========================
app.use(
  '/uploads',
  (req, res, next) => {
    // ✅ Set CORS headers explicitly for images
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  },
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
      // Set proper cache and content headers
      res.setHeader('Cache-Control', 'public, max-age=3600');

      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
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

const internSubmittedRoute = loadRoute('./routes/internSubmittedDocuments', 'internSubmittedDocuments');
if (internSubmittedRoute) app.use('/api/reports', internSubmittedRoute);

const adviserListRoute = loadRoute('./routes/adviserList', 'adviserList');
if (adviserListRoute) app.use('/api/reports', adviserListRoute);

const internEvalReportRoute = loadRoute('./routes/internEvaluationReport', 'internEvaluationReport');
if (internEvalReportRoute) app.use('/api/reports', internEvalReportRoute);

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
  // Startup confirmation for troubleshooting missing-route 404s
  console.log('[ROUTE] /api (internDailyLogRoutes) loaded and registered');
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


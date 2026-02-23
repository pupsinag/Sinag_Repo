/* eslint-env node */
const { verify } = require('../utils/jwt');

/**
 * Authentication & Authorization Middleware
 *
 * Usage:
 *  - router.use(authMiddleware())
 *  - router.use(authMiddleware(['coordinator']))
 */
function authMiddleware(allowedRoles = []) {
  // normalize roles to array (lowercase)
  const roles = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => r.toLowerCase())
    : typeof allowedRoles === 'string'
      ? [allowedRoles.toLowerCase()]
      : [];

  return async (req, res, next) => {
    console.log('[DEBUG] authMiddleware called');
    console.log('--- [authMiddleware] Incoming request:', req.method, req.originalUrl);
    console.log('Headers:', req.headers);
    const authHeader = req.headers.authorization;
    const headerToken = req.headers['x-auth-token'];
    const cookieHeader = req.headers.cookie || '';
    const cookieToken = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .map((part) => part.split('='))
      .find(([key]) => key === 'token')?.[1];
    const queryToken = req.query?.token;

    /* =========================
       1. CHECK AUTH HEADER
    ========================= */
    let token = null;
    
    // Priority 1: Cookie (most reliable for browser-based apps)
    if (cookieToken && decodeURIComponent(cookieToken).trim()) {
      token = decodeURIComponent(cookieToken).trim();
      console.log('✅ Token from cookie');
    }
    
    // Priority 2: Bearer Authorization header (if valid)
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      const extractedToken = authHeader.split(' ')[1];
      if (extractedToken && extractedToken.trim() && extractedToken !== 'null') {
        token = extractedToken.trim();
        console.log('✅ Token from Bearer header');
      }
    }
    
    // Priority 3: x-auth-token header
    if (!token && headerToken && String(headerToken).trim() && String(headerToken) !== 'null') {
      token = String(headerToken).trim();
      console.log('✅ Token from x-auth-token header');
    }
    
    // Priority 4: Query parameter
    if (!token && queryToken && String(queryToken).trim()) {
      token = String(queryToken).trim();
      console.log('✅ Token from query');
    }

    if (!token) {
      console.error('❌ [authMiddleware] Missing or invalid authorization header');
      return res.status(401).json({
        message: 'Missing or invalid authorization header',
      });
    }

    try {
      /* =========================
         2. VERIFY JWT
      ========================= */
      console.log('[authMiddleware] Before verify');
      const payload = verify(token);
      console.log('[authMiddleware] After verify:', payload);

      if (!payload?.id || !payload?.role) {
        console.error('❌ [authMiddleware] Invalid token payload:', payload);
        return res.status(401).json({
          message: 'Invalid token payload',
        });
      }

      /* =========================
         3. ATTACH USER TO REQUEST
      ========================= */
      // Fetch latest user/company data from DB
      const db = require('../models');
      let userRecord;

      // 🔑 If role is 'supervisor', look in COMPANIES table instead of USERS
      if (payload.role === 'supervisor' || payload.role === 'company') {
        console.log('[authMiddleware] Looking up company from COMPANIES table');
        userRecord = await db.Company.findByPk(payload.id);
        if (!userRecord) {
          return res.status(401).json({ message: 'Company not found' });
        }
        req.user = {
          id: userRecord.id,
          email: userRecord.email,
          role: 'supervisor',
          name: userRecord.name,
          supervisorName: userRecord.supervisorName,
        };
      } else {
        // Regular user lookup for other roles
        console.log('[authMiddleware] Looking up user from USERS table');
        userRecord = await db.User.findByPk(payload.id);
        if (!userRecord) {
          return res.status(401).json({ message: 'User not found' });
        }
        req.user = {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role ? userRecord.role.toLowerCase() : null,
          program: userRecord.program || null,
          year_section: userRecord.year_section || null,
          yearSection: userRecord.yearSection || null,
          firstName: userRecord.firstName || null,
          lastName: userRecord.lastName || null,
        };
      }
      console.log('[authMiddleware] User attached to request:', req.user);

      /* =========================
         4. ROLE-BASED ACCESS CHECK
      ========================= */

      // 🔥 NORMALIZE ROLE (Supervisor = Company)
      let effectiveRole = req.user.role;
      if (effectiveRole === 'supervisor') {
        effectiveRole = 'company';
      }

      if (roles.length && !roles.includes(effectiveRole)) {
        return res.status(403).json({
          message: 'Access denied',
        });
      }

      /* =========================
         5. CONTINUE
      ========================= */
      next();
      console.log('[authMiddleware] Called next()');
    } catch (err) {
      console.error('Auth middleware error:', err);
      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }
  };
}

// Export the middleware directly (so you can pass roles if needed)
module.exports = authMiddleware;

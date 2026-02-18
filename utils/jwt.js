/* eslint-env node */
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function sign(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: opts.expiresIn || '5m' });
}

function verify(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { sign, verify };

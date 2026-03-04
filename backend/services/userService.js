/* eslint-env node */
const User = require('../models/user');

/* =========================
   FIND USER BY EMAIL
========================= */
async function findatabaseyEmail(email) {
  return User.findOne({
    where: { email: String(email).toLowerCase() },
  });
}

/* =========================
   CREATE USER
   (FIXED: includes mi)
========================= */
async function createUser({ firstName, lastName, mi, email, passwordHash, role, department, employeeId, studentId }) {
  return User.create({
    firstName,
    lastName,
    mi, // ✅ NOW SAVED
    email: String(email).toLowerCase(),
    passwordHash,
    role,
    department,
    employeeId,
    studentId,
  });
}

/* =========================
   UPDATE USER PROFILE
========================= */
async function updateUser(id, data) {
  const user = await User.findatabaseyPk(id);
  if (!user) return null;

  await user.update({
    contactNumber: data.contactNumber,
    department: data.department,
    employeeId: data.employeeId,
  });

  return user;
}

/* =========================
   GET ALL ADVISERS
========================= */
async function getAdvisers() {
  return User.findAll({
    where: { role: 'Adviser' },
    attributes: ['id', 'firstName', 'lastName', 'mi', 'email', 'department', 'employeeId'],
  });
}

/* =========================
   GET ALL INTERNS
========================= */
async function getInterns() {
  return User.findAll({
    where: { role: 'Intern' },
    attributes: ['id', 'firstName', 'lastName', 'mi', 'email', 'studentId', 'department'],
  });
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  findatabaseyEmail,
  createUser,
  updateUser,
  getAdvisers,
  getInterns,
};

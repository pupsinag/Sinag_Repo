/* eslint-env node */
const bcrypt = require('bcryptjs');
const userService = require('./userService');
const companyService = require('./companyService');
const jwtUtil = require('../utils/jwt');

/* =========================
   COORDINATOR SIGNUP
========================= */
async function signup({ firstName, lastName, email, password }) {
  const existing = await userService.findatabaseyEmail(email);
  if (existing) throw new Error('User already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await userService.createUser({
    firstName,
    lastName,
    email,
    passwordHash,
    role: 'Coordinator',
  });

  const token = jwtUtil.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    type: 'user',
  });

  return {
    message: 'User created successfully',
    token,
    user,
  };
}

/* =========================
   ADD ADVISER ACCOUNT
========================= */
async function addAdviser({
  firstName,
  lastName,
  mi, // ✅ INCLUDED
  email,
  password,
  department,
  employeeId,
}) {
  const existing = await userService.findatabaseyEmail(email);
  if (existing) throw new Error('User already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await userService.createUser({
    firstName,
    lastName,
    mi, // ✅ SAVED
    email,
    passwordHash,
    role: 'Adviser',
    department,
    employeeId,
  });

  return {
    message: 'Adviser created successfully',
    user,
  };
}

/* =========================
   ADD INTERN ACCOUNT
========================= */
async function addIntern({
  firstName,
  lastName,
  mi, // optional but supported
  email,
  password,
  program,
  studentId,
}) {
  const existing = await userService.findatabaseyEmail(email);
  if (existing) throw new Error('User already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await userService.createUser({
    firstName,
    lastName,
    mi,
    email,
    passwordHash,
    role: 'Intern',
    department: program,
    studentId,
  });

  return {
    message: 'Intern created successfully',
    user,
  };
}

/* =========================
   ADD COMPANY ACCOUNT
========================= */
async function addCompany({
  name,
  email,
  address,
  natureOfBusiness,
  supervisorName,
  moaStart,
  moaEnd,
  moaFile,
  password,
}) {
  const existing = await companyService.getCompanyByEmail(email);
  if (existing) throw new Error('Company already exists');

  const passwordHash = await bcrypt.hash(password, 10);

  const company = await companyService.createCompany({
    name,
    email,
    address,
    natureOfBusiness,
    supervisorName,
    moaStart,
    moaEnd,
    moaFile,
    password: passwordHash,
  });

  return {
    message: 'Company created successfully',
    company,
  };
}

/* =========================
   LOGIN (USER OR COMPANY)
========================= */
async function login({ email, password }) {
  /** 1️⃣ USER LOGIN */
  const user = await userService.findatabaseyEmail(email);
  if (user) {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Invalid credentials');

    const token = jwtUtil.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'user',
      department: user.department || null,
    });

    return {
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        type: 'user',
        department: user.department || null,
      },
    };
  }

  /** 2️⃣ COMPANY LOGIN */
  const company = await companyService.getCompanyByEmail(email);
  if (company) {
    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) throw new Error('Invalid credentials');

    const token = jwtUtil.sign({
      id: company.id,
      email: company.email,
      role: 'supervisor',
      type: 'company',
      supervisorName: company.supervisorName,
      companyName: company.name,
    });

    return {
      message: 'Logged in successfully',
      token,
      user: {
        id: company.id,
        email: company.email,
        role: 'supervisor',
        type: 'company',
        supervisorName: company.supervisorName,
        companyName: company.name,
      },
    };
  }

  throw new Error('Invalid credentials');
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  signup,
  login,
  addAdviser,
  addIntern,
  addCompany,
};

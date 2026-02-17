/* eslint-env node */
const Company = require('../models/company');

async function createCompany({
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
  return Company.create({
    name,
    email,
    address,
    natureOfBusiness,
    supervisorName,
    moaStart,
    moaEnd,
    moaFile: moaFile,
    password,
  });
}

async function getAllHTE() {
  return Company.findAll();
}

async function getCompanyById(id) {
  return Company.findatabaseyPk(id);
}

async function getCompanyByEmail(email) {
  return Company.findOne({ where: { email: String(email).toLowerCase() } });
}

module.exports = { createCompany, getAllHTE, getCompanyById, getCompanyByEmail };

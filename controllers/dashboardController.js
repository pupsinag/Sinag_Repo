/* =========================
   GET YEAR SECTIONS FOR PROGRAM
========================= */
exports.getYearSectionsForProgram = async (req, res, next) => {
  try {
    const { program } = req.query;
    if (!program) return res.status(400).json({ message: 'Program is required' });

    // Normalize program for matching
    const normalizedProgram = normalizeProgramFull(program);

    // Find all unique year_section for the given program
    const yearSections = await Intern.findAll({
      attributes: [[fn('DISTINCT', col('year_section')), 'year_section']],
      where: {
        [Op.and]: [literal(`REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = '${normalizedProgram}'`)],
      },
      raw: true,
    });
    // Return all non-null, unique year_section values
    res.json(yearSections.map((ys) => ys.year_section).filter(Boolean));
  } catch (err) {
    console.error('❌ getYearSectionsForProgram:', err);
    next(err);
  }
};
/* eslint-env node */
const { fn, col, literal, Op } = require('sequelize');
const { Intern, Company, User } = require('../models');

// Add this mapping at the top (customize as needed)
const PROGRAM_MAP = {
  BSBAHRM: 'BACHELOROFSCIENCEINBUSINESSADMINISTRATION',
  BSA: 'BACHELOROFSCIENCEINACCOUNTANCY',
  BSIT: 'BACHELOROFSCIENCEININFORMATIONTECHNOLOGY',
  // ...add other acronyms as needed...
};

/* =========================
   HELPER: NORMALIZE PROGRAM BASE
========================= */
function normalizeProgramBase(program) {
  if (!program) return '';
  // Remove "MAJOR ..." and everything after, no replacement with "_"
  return program
    .replace(/MAJOR.*/i, '')
    .replace(/[\s\-]/g, '')
    .toUpperCase();
}

/* =========================
   HELPER: NORMALIZE PROGRAM FULL
========================= */
function normalizeProgramFull(program) {
  if (!program) return '';
  return program.replace(/[\s\-]/g, '').toUpperCase();
}

/* =========================
   GET PROGRAM FILTERS
========================= */
exports.getAdviserPrograms = async (req, res, next) => {
  try {
    const advisers = await User.findAll({
      where: { role: 'adviser' },
      attributes: ['program'],
      raw: true,
    });
    const programs = [...new Set(advisers.map((a) => a.program).filter(Boolean))];
    res.json(programs);
  } catch (err) {
    console.error('❌ getAdviserPrograms:', err);
    next(err);
  }
};

/* =========================
   GET INTERNS PER PROGRAM
========================= */
exports.getPrograms = async (req, res, next) => {
  try {
    // Get intern counts per program (from Interns table only)
    const internCounts = await Intern.findAll({
      attributes: ['program', [fn('COUNT', col('Intern.id')), 'count']],
      group: ['program'],
      raw: true,
    });

    // Return all programs found in Interns table, with their counts
    const results = internCounts.map((item) => ({
      program: item.program,
      count: Number(item.count),
    }));

    res.json(results);
  } catch (err) {
    console.error('❌ getPrograms:', err);
    next(err);
  }
};

/* =========================
   GET INTERNS PER COMPANY
========================= */
exports.getCompanies = async (req, res, next) => {
  try {
    let whereCondition = {};
    if (req.query.program && req.query.program !== 'All') {
      if (/MAJOR/i.test(req.query.program)) {
        whereCondition = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = '${normalizeProgramFull(req.query.program)}'
            `),
          ],
        };
      } else {
        whereCondition = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(
                UPPER(
                  CASE
                    WHEN LOCATE('MAJOR', program) > 0
                    THEN SUBSTRING(program, 1, LOCATE('MAJOR', program) - 1)
                    ELSE program
                  END
                ), ' ', ''), '-', ''
              ) = '${normalizeProgramBase(req.query.program)}'
            `),
          ],
        };
      }
    }
    if (req.user.role === 'adviser') {
      if (!req.user.program) return res.json([]);
      if (/MAJOR/i.test(req.user.program)) {
        whereCondition = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = '${normalizeProgramFull(req.user.program)}'
            `),
          ],
        };
      } else {
        whereCondition = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(
                UPPER(
                  CASE
                    WHEN LOCATE('MAJOR', program) > 0
                    THEN SUBSTRING(program, 1, LOCATE('MAJOR', program) - 1)
                    ELSE program
                  END
                ), ' ', ''), '-', ''
              ) = '${normalizeProgramBase(req.user.program)}'
            `),
          ],
        };
      }
    }
    // No status filter: count all interns

    const allCompanies = await Company.findAll({
      attributes: ['id', 'name'],
      raw: true,
    });

    const internCounts = await Intern.findAll({
      attributes: ['company_id', [fn('COUNT', col('Intern.id')), 'count']],
      where: whereCondition,
      group: ['company_id'],
      raw: true,
    });

    const countMap = {};
    internCounts.forEach((item) => {
      countMap[item.company_id] = Number(item.count);
    });

    const results = allCompanies.map((company) => ({
      company: company.name,
      count: countMap[company.id] || 0,
    }));

    results.sort((a, b) => b.count - a.count);

    res.json(results);
  } catch (err) {
    console.error('❌ getCompanies:', err);
    next(err);
  }
};

/* =========================
   KPI COUNTS
========================= */
exports.getKpis = async (req, res, next) => {
  try {
    // Get all adviser programs (unique, non-null, trimmed)
    const adviserPrograms = await User.findAll({
      where: { role: 'adviser' },
      attributes: [[fn('DISTINCT', col('program')), 'program']],
      raw: true,
    });
    const adviserProgramList = adviserPrograms.map((a) => a.program && a.program.trim()).filter(Boolean);

    const selectedProgram =
      req.query && req.query.program && req.query.program !== 'All' ? req.query.program.trim() : null;

    let internWhere = {};
    if (req.user.role === 'adviser' && req.user.program) {
      if (/MAJOR/i.test(req.user.program)) {
        internWhere = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = '${normalizeProgramFull(req.user.program)}'
            `),
          ],
        };
      } else {
        internWhere = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(
                UPPER(
                  CASE
                    WHEN LOCATE('MAJOR', program) > 0
                    THEN SUBSTRING(program, 1, LOCATE('MAJOR', program) - 1)
                    ELSE program
                  END
                ), ' ', ''), '-', ''
              ) = '${normalizeProgramBase(req.user.program)}'
            `),
          ],
        };
      }
    } else if (selectedProgram) {
      // If selectedProgram is an acronym, map to full base name and use LIKE
      const acronym = selectedProgram.toUpperCase();
      if (PROGRAM_MAP[acronym]) {
        internWhere = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') LIKE '${PROGRAM_MAP[acronym]}%'
            `),
          ],
        };
      } else if (/MAJOR/i.test(selectedProgram)) {
        internWhere = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(
                REPLACE(UPPER(program), 'MAJOR', ''),
                ' ',
                ''
              ), '-', ''
              ) = '${normalizeProgramBase(selectedProgram)}'
            `),
          ],
        };
      } else {
        internWhere = {
          [Op.and]: [
            literal(`
              REPLACE(REPLACE(
                UPPER(
                  CASE
                    WHEN LOCATE('MAJOR', program) > 0
                    THEN SUBSTRING(program, 1, LOCATE('MAJOR', program) - 1)
                    ELSE program
                  END
                ), ' ', ''), '-', ''
              ) = '${normalizeProgramBase(selectedProgram)}'
            `),
          ],
        };
      }
    }
    // No status filter: count all interns

    const [activeInterns, partnerHTE] = await Promise.all([Intern.count({ where: internWhere }), Company.count()]);

    const activePrograms = adviserProgramList.length;

    res.json({ activeInterns, activePrograms, partnerHTE });
  } catch (err) {
    console.error('❌ getKpis:', err);
    next(err);
  }
};

/* =========================
   ADVISER KPI
========================= */
exports.getAdviserKpis = async (req, res, next) => {
  try {
    if (req.user.role !== 'adviser') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!req.user.program) {
      return res.json({
        activeInterns: 0,
        activeProgram: null,
        partnerHTE: 0,
      });
    }

    let internWhere = {};
    if (/MAJOR/i.test(req.user.program)) {
      internWhere = {
        [Op.and]: [
          literal(`
            REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = '${normalizeProgramFull(req.user.program)}'
          `),
        ],
      };
    } else {
      internWhere = {
        [Op.and]: [
          literal(`
            REPLACE(REPLACE(
              UPPER(
                CASE
                  WHEN LOCATE('MAJOR', program) > 0
                  THEN SUBSTRING(program, 1, LOCATE('MAJOR', program) - 1)
                  ELSE program
                END
              ), ' ', ''), '-', ''
            ) = '${normalizeProgramBase(req.user.program)}'
          `),
        ],
      };
    }

    const activeInterns = await Intern.count({ where: internWhere });
    const partnerHTE = await Company.count();

    res.json({
      activeInterns,
      activeProgram: req.user.program,
      partnerHTE,
    });
  } catch (err) {
    console.error('❌ getAdviserKpis:', err);
    next(err);
  }
};

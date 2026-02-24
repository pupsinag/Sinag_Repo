/* =========================
   GET YEAR SECTIONS FOR PROGRAM
========================= */
exports.getYearSectionsForProgram = async (req, res, next) => {
  try {
    const { program } = req.query;
    if (!program) return res.status(400).json({ message: 'Program is required' });

    // Normalize program for matching
    const normalizedProgram = normalizeProgramFull(program);

    console.log('🔍 Fetching year sections for program:', program);
    console.log('📝 Normalized program:', normalizedProgram);

    // Find all unique year_section for the given program
    // Use sequelize.query for more reliable DISTINCT handling
    const yearSectionsRaw = await sequelize.query(
      `SELECT DISTINCT year_section FROM interns 
       WHERE year_section IS NOT NULL 
       AND REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = :normalizedProgram
       ORDER BY year_section ASC`,
      {
        replacements: { normalizedProgram },
        type: QueryTypes.SELECT,
      }
    );

    const yearSections = yearSectionsRaw.map((row) => row.year_section);
    
    console.log('✅ Found year sections:', yearSections);
    res.json(yearSections);
  } catch (err) {
    console.error('❌ getYearSectionsForProgram:', err);
    next(err);
  }
};
/* eslint-env node */
const { fn, col, literal, Op, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
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
      where: literal(`LOWER(role) = 'adviser'`),
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
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    
    // 🟢 COORDINATOR/SUPERADMIN: see ALL companies
    if (userRole === 'coordinator' || userRole === 'superadmin') {
      // No filter - get all
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
    }
    // 🟢 ADVISER: see only their program's companies
    else if (userRole === 'adviser') {
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
      where: literal(`LOWER(role) = 'adviser'`),
      attributes: [[fn('DISTINCT', col('program')), 'program']],
      raw: true,
    });
    const adviserProgramList = adviserPrograms.map((a) => a.program && a.program.trim()).filter(Boolean);

    const selectedProgram =
      req.query && req.query.program && req.query.program !== 'All' ? req.query.program.trim() : null;

    let internWhere = {};
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    
    // 🟢 COORDINATOR/SUPERADMIN: see ALL interns
    if (userRole === 'coordinator' || userRole === 'superadmin') {
      // No WHERE condition - count all interns
      internWhere = {};
    }
    // 🟢 ADVISER: see only their program's interns (and year_section if applicable)
    else if (userRole === 'adviser' && req.user.program) {
      // ✅ CRITICAL: Filter by both programme AND year_section for advisers
      const adviserYearSection = req.user.yearSection || req.user.year_section;
      const baseFilter = /MAJOR/i.test(req.user.program)
        ? `REPLACE(REPLACE(UPPER(program), ' ', ''), '-', '') = '${normalizeProgramFull(req.user.program)}'`
        : `REPLACE(REPLACE(
            UPPER(
              CASE
                WHEN LOCATE('MAJOR', program) > 0
                THEN SUBSTRING(program, 1, LOCATE('MAJOR', program) - 1)
                ELSE program
              END
            ), ' ', ''), '-', ''
          ) = '${normalizeProgramBase(req.user.program)}'`;
      
      const conditions = [baseFilter];
      
      // Add year_section filter if adviser has one
      if (adviserYearSection) {
        conditions.push(`REPLACE(LOWER(year_section), ' ', '') = REPLACE(LOWER('${adviserYearSection}'), ' ', '')`);
      }
      
      internWhere = {
        [Op.and]: [literal(conditions.join(' AND '))],
      };
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
    const adviserYearSection = req.user.yearSection || req.user.year_section;
    
    // ✅ CRITICAL: Filter by both programme AND year_section if adviser has one
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

    // Add year_section filter if adviser has one
    if (adviserYearSection) {
      const baseCondition = internWhere[Op.and][0];
      internWhere[Op.and] = [
        literal(`${baseCondition} AND REPLACE(LOWER(year_section), ' ', '') = REPLACE(LOWER('${adviserYearSection}'), ' ', '')`)
      ];
      console.log('[getAdviserKpis] Filtering by program:', req.user.program, 'and year_section:', adviserYearSection);
    } else {
      console.log('[getAdviserKpis] Filtering by program:', req.user.program, 'only (no year_section)');
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

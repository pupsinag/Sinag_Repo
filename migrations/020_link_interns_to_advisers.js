/* =========================
   MIGRATION: Link Interns to Advisers
   ========================= 
   
   This migration links existing interns to their advisers based on:
   1. Matching program
   2. Matching year_section
*/

const { Intern, User } = require('../models');
const { Op } = require('sequelize');

async function runMigration() {
  try {
    console.log('\n\n========== LINKING INTERNS TO ADVISERS ==========\n');

    // Get all interns without an adviser_id
    const internsWithoutAdviser = await Intern.findAll({
      where: {
        adviser_id: null,
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: ['id', 'program', 'yearSection'],
        },
      ],
    });

    console.log(`Found ${internsWithoutAdviser.length} interns without adviser_id\n`);

    if (internsWithoutAdviser.length === 0) {
      console.log('✅ All interns already have adviser_id assigned!');
      return;
    }

    let updated = 0;
    let unmatched = 0;

    for (const intern of internsWithoutAdviser) {
      const internProgram = intern.program;
      const internYearSection = intern.year_section;

      console.log(`\n📋 Processing Intern: ${intern.User.firstName} ${intern.User.lastName}`);
      console.log(`   Program: ${internProgram}`);
      console.log(`   Year Section: ${internYearSection}`);

      // Find adviser with matching program and year_section
      const matchingAdviser = await User.findOne({
        where: {
          role: 'adviser',
          program: internProgram,
          // Normalize year_section comparison (remove spaces, lowercase)
          yearSection: internYearSection || null,
        },
      });

      if (matchingAdviser) {
        console.log(`   ✅ Found matching adviser: ${matchingAdviser.firstName} ${matchingAdviser.lastName} (ID: ${matchingAdviser.id})`);
        
        // Link the intern to the adviser
        await intern.update({
          adviser_id: matchingAdviser.id,
        });
        
        updated++;
      } else {
        console.log(`   ⚠️  No matching adviser found for program: ${internProgram}, year_section: ${internYearSection}`);
        unmatched++;
      }
    }

    console.log(`\n\n========== MIGRATION SUMMARY ==========`);
    console.log(`✅ Interns updated: ${updated}`);
    console.log(`⚠️  Interns without matching adviser: ${unmatched}`);
    console.log(`\n✅ Migration completed successfully!\n`);

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const { sequelize } = require('../models');
  
  sequelize.authenticate()
    .then(() => {
      console.log('✅ Database connected');
      return runMigration();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Connection failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };

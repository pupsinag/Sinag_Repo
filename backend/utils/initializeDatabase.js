const sequelize = require('./config/database');

const initializeDatabase = async () => {
  try {
    // Check if remarks column exists in supervisor_evaluations table
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('supervisor_evaluations');
    
    if (!columns.remarks) {
      console.log('📝 Adding remarks column to supervisor_evaluations table...');
      await queryInterface.addColumn('supervisor_evaluations', 'remarks', {
        type: require('sequelize').DataTypes.TEXT,
        allowNull: true,
      });
      console.log('✅ remarks column added successfully');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

module.exports = initializeDatabase;

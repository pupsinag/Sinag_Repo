const { Sequelize } = require('sequelize');
require('dotenv').config();

async function testForeignKey() {
  try {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: '../database.sqlite',
      logging: console.log,
    });

    try {
      await sequelize.query('INSERT INTO interns (user_id, program) VALUES (1, "Computer Science")');
      console.log('Successfully created intern record!');
    } catch (err) {
      console.error('Error creating intern record:', err.message);
    }

    await sequelize.close();
  } catch (err) {
    console.error('Database connection failed:', err);
  }
}

testForeignKey();

const { Sequelize } = require('sequelize');
require('dotenv').config();

async function createMissingTables() {
  try {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: '../database.sqlite',
      logging: console.log,
    });

// Create interns table
    await sequelize.query(`
CREATE TABLE IF NOT EXISTS interns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        remarks TEXT,
        adviser_id INTEGER,
        supervisor_id INTEGER,
        company_id INTEGER,
        position TEXT,
        program TEXT NOT NULL,
        year_section TEXT,
        start_date TEXT,
        end_date TEXT,
        required_hours INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (adviser_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);

    console.log('Interns table created successfully!');

    await sequelize.close();
  } catch (err) {
    console.error('Error creating tables:', err);
  }
}

createMissingTables();

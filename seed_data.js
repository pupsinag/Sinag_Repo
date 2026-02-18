const { Sequelize } = require('sequelize');
require('dotenv').config();

async function seedData() {
  try {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: '../database.sqlite',
      logging: console.log,
    });

    // Insert default evaluation settings
    await sequelize.query(`
      INSERT INTO supervisor_evaluation_items (evaluation_id, section, indicator, rating, createdAt, updatedAt)
      VALUES 
        (1, 'Technical Skills', 'Demonstrates proficiency in required technical skills', 5, datetime('now'), datetime('now')),
        (1, 'Work Ethics', 'Shows good work ethics and professionalism', 5, datetime('now'), datetime('now')),
        (1, 'Communication', 'Communicates effectively with team members', 5, datetime('now'), datetime('now')),
        (1, 'Initiative', 'Shows initiative and willingness to learn', 5, datetime('now'), datetime('now')),
        (1, 'Teamwork', 'Works well with others in a team environment', 5, datetime('now'), datetime('now'));
    `);

    // Insert sample company
    await sequelize.query(`
      INSERT INTO companies (name, email, address, natureOfBusiness, supervisorName, password, forcePasswordChange, createdAt, updatedAt)
      VALUES 
        ('Sample Company', 'company@sample.com', '123 Business St, Makati City', 'Software Development', 'John Doe', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, datetime('now'), datetime('now'));
    `);

    // Insert sample supervisor
    await sequelize.query(`
      INSERT INTO supervisors (name, email, phone, is_active, company_id, createdAt, updatedAt)
      VALUES 
        ('Jane Smith', 'jane.smith@sample.com', '09123456789', 1, 1, datetime('now'), datetime('now'));
    `);

    // Insert sample intern
    await sequelize.query(`
      INSERT INTO users (email, password, firstName, lastName, role, program, yearSection, createdAt, updatedAt)
      VALUES 
        ('john.doe@student.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', 'intern', 'BS Computer Science', '2024-2025', datetime('now'), datetime('now'));
    `);

    await sequelize.query(`
      INSERT INTO interns (user_id, status, program, year_section, start_date, end_date, required_hours, createdAt, updatedAt)
      VALUES 
        (2, 'Approved', 'BS Computer Science', '2024-2025', '2024-06-01', '2024-11-30', 300, datetime('now'), datetime('now'));
    `);

    // Insert sample daily log
    await sequelize.query(`
      INSERT INTO intern_daily_logs (intern_id, day_no, log_date, time_in, time_out, total_hours, tasks_accomplished, skills_enhanced, learning_applied, supervisor_status, adviser_status, createdAt, updatedAt)
      VALUES 
        (1, 1, '2024-06-01', '08:00:00', '17:00:00', 8.00, 'Completed onboarding and system setup', 'Learned company systems and processes', 'Understood project workflow', 'Approved', 'Approved', datetime('now'), datetime('now'));
    `);

    // Insert sample evaluation
    await sequelize.query(`
      INSERT INTO intern_evaluations (intern_id, internName, section, hteName, jobDescription, totalScore, technicalDetails, recommendations, remarks, evaluator, designation, date, conforme, createdAt, updatedAt)
      VALUES 
        (1, 'John Doe', '2024-2025', 'Sample Company', 'Software Development Intern', 95.0, 'Excellent technical skills and problem-solving abilities', 'Continue with current performance', 'Outstanding intern', 'Jane Smith', 'Supervisor', '2024-11-30', 'Conforme', datetime('now'), datetime('now'));
    `);

    console.log('Data seeding completed successfully!');
    await sequelize.close();
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

seedData();
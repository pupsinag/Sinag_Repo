-- Data Seeding for SINAG Internship Management System
-- MySQL 8.0+ with InnoDB engine

USE pup_sinag;

-- Insert default evaluation settings
INSERT INTO supervisor_evaluation_items (evaluation_id, section, indicator, rating, createdAt, updatedAt) VALUES
(1, 'Technical Skills', 'Demonstrates proficiency in required technical skills', 5, NOW(), NOW()),
(1, 'Work Ethics', 'Shows good work ethics and professionalism', 5, NOW(), NOW()),
(1, 'Communication', 'Communicates effectively with team members', 5, NOW(), NOW()),
(1, 'Initiative', 'Shows initiative and willingness to learn', 5, NOW(), NOW()),
(1, 'Teamwork', 'Works well with others in a team environment', 5, NOW(), NOW());

-- Insert sample company
INSERT INTO companies (name, email, address, natureOfBusiness, supervisorName, password, forcePasswordChange, createdAt, updatedAt) VALUES
('Sample Company', 'company@sample.com', '123 Business St, Makati City', 'Software Development', 'John Doe', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE, NOW(), NOW());

-- Insert sample supervisor
INSERT INTO supervisors (name, email, phone, is_active, company_id, createdAt, updatedAt) VALUES
('Jane Smith', 'jane.smith@sample.com', '09123456789', TRUE, 1, NOW(), NOW());

-- Insert sample intern
INSERT INTO users (email, password, firstName, lastName, role, program, yearSection, createdAt, updatedAt) VALUES
('john.doe@student.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', 'intern', 'BS Computer Science', '2024-2025', NOW(), NOW());

INSERT INTO interns (user_id, status, program, year_section, start_date, end_date, required_hours, createdAt, updatedAt) VALUES
(2, 'Approved', 'BS Computer Science', '2024-2025', '2024-06-01', '2024-11-30', 300, NOW(), NOW());

-- Insert sample daily log
INSERT INTO intern_daily_logs (intern_id, day_no, log_date, time_in, time_out, total_hours, tasks_accomplished, skills_enhanced, learning_applied, supervisor_status, adviser_status, createdAt, updatedAt) VALUES
(1, 1, '2024-06-01', '08:00:00', '17:00:00', 8.00, 'Completed onboarding and system setup', 'Learned company systems and processes', 'Understood project workflow', 'Approved', 'Approved', NOW(), NOW());

-- Insert sample evaluation
INSERT INTO intern_evaluations (intern_id, internName, section, hteName, jobDescription, totalScore, technicalDetails, recommendations, remarks, evaluator, designation, date, conforme, createdAt, updatedAt) VALUES
(1, 'John Doe', '2024-2025', 'Sample Company', 'Software Development Intern', 95.0, 'Excellent technical skills and problem-solving abilities', 'Continue with current performance', 'Outstanding intern', 'Jane Smith', 'Supervisor', '2024-11-30', 'Conforme', NOW(), NOW());

COMMIT;
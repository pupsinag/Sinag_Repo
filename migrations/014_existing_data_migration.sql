-- Existing Data Migration for SINAG Internship Management System
-- MySQL 8.0+ with InnoDB engine

USE pup_sinag;

-- Check if existing data exists in current tables
-- This migration will handle data from the current Sequelize-based system

-- Migrate users data
INSERT INTO users (id, email, password, firstName, lastName, mi, studentId, role, program, yearSection, guardian, resetCode, resetCodeExpires, forcePasswordChange, createdAt, updatedAt)
SELECT 
  id, 
  email, 
  password, 
  firstName, 
  lastName, 
  mi, 
  studentId, 
  role, 
  program, 
  yearSection, 
  guardian, 
  resetCode, 
  resetCodeExpires, 
  forcePasswordChange, 
  createdAt, 
  updatedAt
FROM old_users
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = old_users.id);

-- Migrate companies data
INSERT INTO companies (id, name, email, address, natureOfBusiness, supervisorName, moaStart, moaEnd, moaFile, password, forcePasswordChange, createdAt, updatedAt)
SELECT 
  id, 
  name, 
  email, 
  address, 
  natureOfBusiness, 
  supervisorName, 
  moaStart, 
  moaEnd, 
  moaFile, 
  password, 
  forcePasswordChange, 
  createdAt, 
  updatedAt
FROM old_companies
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE companies.id = old_companies.id);

-- Migrate supervisors data
INSERT INTO supervisors (id, name, email, phone, is_active, user_id, company_id, createdAt, updatedAt)
SELECT 
  id, 
  name, 
  email, 
  phone, 
  is_active, 
  user_id, 
  company_id, 
  createdAt, 
  updatedAt
FROM old_supervisors
WHERE NOT EXISTS (SELECT 1 FROM supervisors WHERE supervisors.id = old_supervisors.id);

-- Migrate interns data
INSERT INTO interns (id, user_id, status, remarks, adviser_id, supervisor_id, company_id, position, program, year_section, start_date, end_date, required_hours, createdAt, updatedAt)
SELECT 
  id, 
  user_id, 
  status, 
  remarks, 
  adviser_id, 
  supervisor_id, 
  company_id, 
  position, 
  program, 
  year_section, 
  start_date, 
  end_date, 
  required_hours, 
  createdAt, 
  updatedAt
FROM old_interns
WHERE NOT EXISTS (SELECT 1 FROM interns WHERE interns.id = old_interns.id);

-- Migrate hte_evaluations data
INSERT INTO hte_evaluations (id, intern_id, company_id, student_name, program, school_term, academic_year, evaluation_date, ratings, remarks, strengths, improvements, recommendations, submitted_by, noted_by, createdAt, updatedAt)
SELECT 
  id, 
  intern_id, 
  company_id, 
  student_name, 
  program, 
  school_term, 
  academic_year, 
  evaluation_date, 
  ratings, 
  remarks, 
  strengths, 
  improvements, 
  recommendations, 
  submitted_by, 
  noted_by, 
  createdAt, 
  updatedAt
FROM old_hte_evaluations
WHERE NOT EXISTS (SELECT 1 FROM hte_evaluations WHERE hte_evaluations.id = old_hte_evaluations.id);

-- Migrate intern_evaluations data
INSERT INTO intern_evaluations (id, intern_id, internName, section, hteName, jobDescription, totalScore, technicalDetails, recommendations, remarks, evaluator, designation, date, conforme, createdAt, updatedAt)
SELECT 
  id, 
  intern_id, 
  internName, 
  section, 
  hteName, 
  jobDescription, 
  totalScore, 
  technicalDetails, 
  recommendations, 
  remarks, 
  evaluator, 
  designation, 
  date, 
  conforme, 
  createdAt, 
  updatedAt
FROM old_intern_evaluations
WHERE NOT EXISTS (SELECT 1 FROM intern_evaluations WHERE intern_evaluations.id = old_intern_evaluations.id);

-- Migrate supervisor_evaluations data
INSERT INTO supervisor_evaluations (id, intern_id, supervisor_id, company_id, academic_year, semester, user_id, createdAt, updatedAt)
SELECT 
  id, 
  intern_id, 
  supervisor_id, 
  company_id, 
  academic_year, 
  semester, 
  user_id, 
  createdAt, 
  updatedAt
FROM old_supervisor_evaluations
WHERE NOT EXISTS (SELECT 1 FROM supervisor_evaluations WHERE supervisor_evaluations.id = old_supervisor_evaluations.id);

-- Migrate intern_daily_logs data
INSERT INTO intern_daily_logs (id, intern_id, day_no, log_date, time_in, time_out, total_hours, tasks_accomplished, skills_enhanced, learning_applied, photo_path, supervisor_status, adviser_status, supervisor_comment, adviser_comment, supervisor_approved_at, adviser_approved_at, createdAt, updatedAt)
SELECT 
  id, 
  intern_id, 
  day_no, 
  log_date, 
  time_in, 
  time_out, 
  total_hours, 
  tasks_accomplished, 
  skills_enhanced, 
  learning_applied, 
  photo_path, 
  supervisor_status, 
  adviser_status, 
  supervisor_comment, 
  adviser_comment, 
  supervisor_approved_at, 
  adviser_approved_at, 
  createdAt, 
  updatedAt
FROM old_intern_daily_logs
WHERE NOT EXISTS (SELECT 1 FROM intern_daily_logs WHERE intern_daily_logs.id = old_intern_daily_logs.id);

-- Migrate intern_documents data
INSERT INTO intern_documents (id, intern_id, consent_form, notarized_agreement, resume, cor, insurance, medical_cert, uploaded_at)
SELECT 
  id, 
  intern_id, 
  consent_form, 
  notarized_agreement, 
  resume, 
  cor, 
  insurance, 
  medical_cert, 
  uploaded_at
FROM old_intern_documents
WHERE NOT EXISTS (SELECT 1 FROM intern_documents WHERE intern_documents.id = old_intern_documents.id);

-- Migrate intern_evaluation_items data
INSERT INTO intern_evaluation_items (id, evaluationId, category, itemText, maxScore, score, remarks, createdAt, updatedAt)
SELECT 
  id, 
  evaluationId, 
  category, 
  itemText, 
  maxScore, 
  score, 
  remarks, 
  createdAt, 
  updatedAt
FROM old_intern_evaluation_items
WHERE NOT EXISTS (SELECT 1 FROM intern_evaluation_items WHERE intern_evaluation_items.id = old_intern_evaluation_items.id);

-- Migrate supervisor_evaluation_items data
INSERT INTO supervisor_evaluation_items (id, evaluation_id, section, indicator, rating, createdAt, updatedAt)
SELECT 
  id, 
  evaluation_id, 
  section, 
  indicator, 
  rating, 
  createdAt, 
  updatedAt
FROM old_supervisor_evaluation_items
WHERE NOT EXISTS (SELECT 1 FROM supervisor_evaluation_items WHERE supervisor_evaluation_items.id = old_supervisor_evaluation_items.id);

-- Update foreign key references if needed
-- This section will handle any necessary foreign key updates
-- For example, if user_id references changed during migration

-- Add indexes for better performance
CREATE INDEX idx_old_users_email ON old_users(email);
CREATE INDEX idx_old_companies_email ON old_companies(email);
CREATE INDEX idx_old_interns_user_id ON old_interns(user_id);

COMMIT;
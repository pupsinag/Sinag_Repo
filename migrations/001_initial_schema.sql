-- Initial Schema for SINAG Internship Management System
-- SQLite with appropriate syntax

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  firstName TEXT,
  lastName TEXT,
  mi TEXT,
  studentId TEXT,
  role TEXT NOT NULL,
  program TEXT,
  yearSection TEXT,
  guardian TEXT,
  resetCode TEXT,
  resetCodeExpires TEXT,
  forcePasswordChange INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  natureOfBusiness TEXT,
  supervisorName TEXT,
  moaStart TEXT,
  moaEnd TEXT,
  moaFile TEXT,
  password TEXT NOT NULL,
  forcePasswordChange INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

-- Supervisors table
CREATE TABLE IF NOT EXISTS supervisors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  user_id INTEGER,
  company_id INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Interns table
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

-- HTE Evaluations table
CREATE TABLE IF NOT EXISTS hte_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  program TEXT NOT NULL,
  school_term TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  evaluation_date TEXT NOT NULL,
  ratings TEXT NOT NULL,
  remarks TEXT,
  strengths TEXT,
  improvements TEXT,
  recommendations TEXT,
  submitted_by TEXT NOT NULL,
  noted_by TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE (intern_id, academic_year, school_term)
);

-- Intern Evaluations table
CREATE TABLE IF NOT EXISTS intern_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  internName TEXT NOT NULL,
  section TEXT,
  hteName TEXT,
  jobDescription TEXT,
  totalScore REAL NOT NULL,
  technicalDetails TEXT,
  recommendations TEXT,
  remarks TEXT,
  evaluator TEXT NOT NULL,
  designation TEXT NOT NULL,
  date TEXT NOT NULL,
  conforme TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Supervisor Evaluations table
CREATE TABLE IF NOT EXISTS supervisor_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  supervisor_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  user_id INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (intern_id, supervisor_id, academic_year, semester),
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Intern Daily Logs table
CREATE TABLE IF NOT EXISTS intern_daily_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  day_no INTEGER NOT NULL,
  log_date TEXT NOT NULL,
  time_in TEXT NOT NULL,
  time_out TEXT NOT NULL,
  total_hours REAL NOT NULL,
  tasks_accomplished TEXT NOT NULL,
  skills_enhanced TEXT,
  learning_applied TEXT,
  photo_path TEXT,
  supervisor_status TEXT NOT NULL DEFAULT 'Pending',
  adviser_status TEXT NOT NULL DEFAULT 'Pending',
  supervisor_comment TEXT,
  adviser_comment TEXT,
  supervisor_approved_at TEXT,
  adviser_approved_at TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE (intern_id, log_date),
  UNIQUE (intern_id, day_no)
);

-- Intern Documents table
CREATE TABLE IF NOT EXISTS intern_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  document_type VARCHAR(100),
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  uploaded_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  remarks TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Intern Evaluation Items table
CREATE TABLE IF NOT EXISTS intern_evaluation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluationId INTEGER NOT NULL,
  category TEXT NOT NULL,
  itemText TEXT NOT NULL,
  maxScore INTEGER NOT NULL,
  score REAL NOT NULL,
  remarks TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (evaluationId) REFERENCES intern_evaluations(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Supervisor Evaluation Items table
CREATE TABLE IF NOT EXISTS supervisor_evaluation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluation_id INTEGER NOT NULL,
  section TEXT NOT NULL,
  indicator TEXT NOT NULL,
  rating INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (evaluation_id) REFERENCES supervisor_evaluations(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Insert initial admin user
INSERT INTO users (email, password, firstName, lastName, role, createdAt, updatedAt) VALUES
('admin@sinag.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System', 'Administrator', 'admin', datetime('now'), datetime('now'));

-- Insert default evaluation settings
INSERT INTO supervisor_evaluation_items (evaluation_id, section, indicator, rating, createdAt, updatedAt) VALUES
(1, 'Technical Skills', 'Demonstrates proficiency in required technical skills', 5, datetime('now'), datetime('now')),
(1, 'Work Ethics', 'Shows good work ethics and professionalism', 5, datetime('now'), datetime('now')),
(1, 'Communication', 'Communicates effectively with team members', 5, datetime('now'), datetime('now')),
(1, 'Initiative', 'Shows initiative and willingness to learn', 5, datetime('now'), datetime('now')),
(1, 'Teamwork', 'Works well with others in a team environment', 5, datetime('now'), datetime('now'));

COMMIT;

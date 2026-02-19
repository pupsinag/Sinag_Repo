-- Idempotent migration: ensure supervisor_evaluation_items table exists
-- Added: 2026-02-20

CREATE TABLE IF NOT EXISTS supervisor_evaluation_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT UNSIGNED NOT NULL,
  section VARCHAR(255) NOT NULL,
  indicator TEXT NOT NULL,
  rating INT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_supervisor_evaluation_items_evaluation_id (evaluation_id),
  CONSTRAINT fk_sei_evaluation FOREIGN KEY (evaluation_id) REFERENCES supervisor_evaluations(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

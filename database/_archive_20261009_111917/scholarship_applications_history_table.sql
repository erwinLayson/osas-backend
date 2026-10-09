CREATE TABLE IF NOT EXISTS scholarship_applications_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  original_id INT NOT NULL,
  student_id INT NOT NULL,
  scholarship_id INT NOT NULL,
  documents JSON,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_id (student_id),
  INDEX idx_scholarship_id (scholarship_id),
  INDEX idx_status (status)
);

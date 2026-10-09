CREATE TABLE IF NOT EXISTS scholarship_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  scholarship_id INT NOT NULL,
  documents JSON,
  status VARCHAR(32) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

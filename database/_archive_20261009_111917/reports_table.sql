-- Create reports table for generated reports
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  generated_by VARCHAR(255),
  filename VARCHAR(255),
  size_bytes BIGINT DEFAULT 0,
  status VARCHAR(64) DEFAULT 'Ready',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
);

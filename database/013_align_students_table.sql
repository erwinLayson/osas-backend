-- 013: Align the students table with what the application expects.
-- studentModel.js inserts/selects `username`, `name` and `password`, and
-- scholarshipApplicationModel.js joins on `st.name`. Migration 002 created
-- `student_name` and omitted `username`/`password`, so student login and
-- account creation were failing with "Unknown column".
ALTER TABLE students
  CHANGE COLUMN `student_name` `name` VARCHAR(255) NOT NULL,
  ADD COLUMN `username` VARCHAR(255) NOT NULL UNIQUE,
  ADD COLUMN `password` VARCHAR(255) NOT NULL;

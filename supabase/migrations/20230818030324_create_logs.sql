-- Create `logs` table
CREATE TABLE logs (
  id SERIAL PRIMARY KEY,
  repo_name TEXT,
  org_name TEXT,
  comment_id INT,
  issue_number INT,
  log_message TEXT,
  level INT,
  timestamp TIMESTAMPTZ DEFAULT current_timestamp
);

CREATE INDEX idx_timestamp ON logs (timestamp);

-- Enable RLS for `logs` table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY
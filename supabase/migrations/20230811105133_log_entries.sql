CREATE TABLE log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_name TEXT,
  org_name TEXT,
  comment_id INT,
  issue_number INT,
  log_message TEXT,
  type TEXT,
  timestamp BIGINT
);

ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
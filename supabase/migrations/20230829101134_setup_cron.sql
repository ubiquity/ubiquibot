-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Runs everyday at 03:00 AM to cleanup logs that are older than a week
-- Use the cron time format to modify the trigger time if necessary
SELECT
  cron.schedule(
    'logs-cleaner', -- Job name
    '0 3 * * *', -- Everyday at 03:00 AM
    $$DELETE FROM logs WHERE timestamp < now() - INTERVAL '1 week'$$
  );

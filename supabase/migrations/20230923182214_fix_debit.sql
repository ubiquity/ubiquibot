ALTER TABLE Debits
ALTER COLUMN amount TYPE NUMERIC;

ALTER TABLE Debits
RENAME COLUMN created_at TO created;

ALTER TABLE Debits
RENAME COLUMN updated_at TO updated;
-- Create the Debits table
CREATE TABLE IF NOT EXISTS Debits (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    amount int8 NOT NULL
);
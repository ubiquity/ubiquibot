CREATE TABLE IF NOT EXISTS label_changes (
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    username text NOT NULL,
    repository text NOT NULL,
    label_from text NOT NULL,
    label_to text NOT NULL,
    approved boolean NOT NULL
);
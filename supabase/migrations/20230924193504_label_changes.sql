CREATE TABLE IF NOT EXISTS label_changes (
    id serial PRIMARY KEY,
    created timestamptz NOT NULL,
    updated timestamptz NOT NULL,
    username text NOT NULL,
    repository text NOT NULL,
    label_from text NOT NULL,
    label_to text NOT NULL,
    authorized boolean NOT NULL
);
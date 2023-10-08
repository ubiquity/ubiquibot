CREATE TABLE IF credits(
    id serial PRIMARY KEY,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    amount int8 not NULL	
);
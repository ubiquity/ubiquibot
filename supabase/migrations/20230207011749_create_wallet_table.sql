CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    created_at text,
    updated_at text
    user_name character varying(255) NOT NULL PRIMARY KEY,
    wallet_address character(42),
);
CREATE TABLE multiplier (
    user_name character varying(255) NOT NULL PRIMARY KEY,
    organization text,
    value numeric,
    reason text,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);
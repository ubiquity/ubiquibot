CREATE TABLE multiplier (
    user_id character varying(255) NOT NULL PRIMARY KEY,
    value numeric,
    reason text,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);
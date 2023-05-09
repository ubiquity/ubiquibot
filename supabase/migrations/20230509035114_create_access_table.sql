CREATE TABLE access (
    user_name character varying(255) NOT NULL PRIMARY KEY,
    repository text,
    priority_access  boolean,
    time_access boolean,
    price_access boolean,
    multiplier_access boolean,
    created_at text,
    updated_at text
);
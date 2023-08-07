
CREATE TABLE IF NOT EXISTS permits (
    id bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY, -- auto-incrementing unique id
    created_at timestamptz NOT NULL,
    organization_id bigint,
    repository_id bigint NOT NULL,
    issue_id bigint NOT NULL,
    network_id int NOT NULL,
    bounty_hunter_id bigint NOT NULL,
    bounty_hunter_address text NOT NULL,
    token_address text NOT NULL,
    payout_amount text NOT NULL,
    nonce text NOT NULL,
    deadline text NOT NULL,
    signature text NOT NULL,
    wallet_owner_address text NOT NULL
);
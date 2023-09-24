CREATE TABLE IF NOT EXISTS
  new_permits (
    id serial primary key,
    created_at timestamptz not null,
    updated_at timestamptz not null,
    network smallserial not null,
    token varchar(42) not null,
    amount numeric not null,
    nonce numeric not null,
    deadline numeric not null,
    beneficiary varchar(42) not null,
    owner varchar(42) not null,
    signature varchar(132) not null
  );

INSERT INTO
  new_permits (
    id,
    created_at,
    updated_at,
    network,
    token,
    amount,
    nonce,
    deadline,
    beneficiary,
    owner,
    signature
  )
SELECT
  id,
  created_at,
  created_at,
  network_id,
  token_address,
  CAST(payout_amount AS numeric),
  CAST(nonce AS numeric),
  CAST(deadline AS numeric),
  bounty_hunter_address,
  wallet_owner_address,
  signature
FROM
  permits;

DROP TABLE permits;

ALTER TABLE new_permits
RENAME TO permits;
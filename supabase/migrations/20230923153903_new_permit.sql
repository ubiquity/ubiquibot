CREATE TABLE IF NOT EXISTS
  new_permits (
    id serial primary key,
    created timestamptz not null,
    updated timestamptz not null,
    network smallserial not null,
    token text check (char_length(token) = 42) not null,
    amount numeric not null,
    nonce numeric not null,
    deadline numeric not null,
    beneficiary text check (char_length(beneficiary) = 42) not null,
    owner text check (char_length(owner) = 42) not null,
    signature text check (char_length(signature) = 132) not null
  );

INSERT INTO
  new_permits (
    id,
    created,
    updated,
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
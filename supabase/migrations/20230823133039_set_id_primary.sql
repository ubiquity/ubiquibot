ALTER TABLE wallets
DROP CONSTRAINT wallets_pkey,
ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);

ALTER TABLE access
DROP CONSTRAINT access_pkey,
ADD CONSTRAINT access_pkey PRIMARY KEY (user_id);

ALTER TABLE penalty
DROP CONSTRAINT penalty_pkey,
ADD CONSTRAINT penalty_pkey PRIMARY KEY (user_id, repository_id, network_id, token_address);

ALTER TABLE users
DROP CONSTRAINT users_pkey,
ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

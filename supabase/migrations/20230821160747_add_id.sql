ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS user_id bigint NOT NULL,
DROP CONSTRAINT wallets_pkey,
DROP COLUMN user_name,
ADD CONSTRAINT wallets_pkey PRIMARY KEY (user_id);

ALTER TABLE access
ADD COLUMN IF NOT EXISTS user_id bigint NOT NULL,
ADD COLUMN IF NOT EXISTS repository_id bigint NOT NULL,
DROP CONSTRAINT access_pkey,
DROP COLUMN repository,
DROP COLUMN user_name,
ADD CONSTRAINT access_pkey PRIMARY KEY (user_id);

ALTER TABLE penalty
ADD COLUMN IF NOT EXISTS user_id bigint NOT NULL,
ADD COLUMN IF NOT EXISTS repository_id bigint NOT NULL,
DROP CONSTRAINT penalty_pkey,
DROP COLUMN username,
DROP COLUMN repository_name,
ADD CONSTRAINT penalty_pkey PRIMARY KEY (user_id, repository_id, network_id, token_address);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_id bigint NOT NULL,
DROP CONSTRAINT users_pkey,
DROP COLUMN user_name,
ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);

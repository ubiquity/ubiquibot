ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS user_id character varying(255) NOT NULL;

ALTER TABLE access
ADD COLUMN IF NOT EXISTS user_id character varying(255) NOT NULL,
ADD COLUMN IF NOT EXISTS repository_id bigint NOT NULL;

ALTER TABLE penalty
ADD COLUMN IF NOT EXISTS user_id character varying(255) NOT NULL,
ADD COLUMN IF NOT EXISTS repository_id bigint NOT NULL;

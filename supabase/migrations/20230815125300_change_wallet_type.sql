ALTER TABLE wallets ALTER COLUMN wallet_address TYPE text;

ALTER TABLE access DROP CONSTRAINT access_pkey;
ALTER TABLE access ADD CONSTRAINT access_pkey PRIMARY KEY (user_name, respository);
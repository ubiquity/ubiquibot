ALTER TABLE public.users 
ALTER COLUMN created_at TYPE timestamp without time zone using created_at::timestamp;

ALTER TABLE public.users
ALTER COLUMN updated_at TYPE timestamp without time zone using updated_at::timestamp;

ALTER TABLE public.wallets
ALTER COLUMN created_at TYPE timestamp without time zone using created_at::timestamp;

ALTER TABLE public.wallets
ALTER COLUMN updated_at TYPE timestamp without time zone using updated_at::timestamp;
ALTER TABLE public.users 
ALTER COLUMN created_at TYPE timestamp without time zone using created_at::timestamp;

ALTER TABLE public.users
ALTER COLUMN updated_at TYPE timestamp without time zone using updated_at::timestamp;

ALTER TABLE public.issues
ALTER COLUMN created_at TYPE timestamp without time zone using created_at::timestamp;

ALTER TABLE public.issues
ALTER COLUMN updated_at TYPE timestamp without time zone using updated_at::timestamp;

ALTER TABLE public.issues
ALTER COLUMN started_at TYPE timestamp without time zone using started_at::timestamp;

ALTER TABLE public.issues
ALTER COLUMN completed_at TYPE timestamp without time zone using completed_at::timestamp;

ALTER TABLE public.issues
ALTER COLUMN closed_at TYPE timestamp without time zone using closed_at::timestamp;

ALTER TABLE public.wallets
ALTER COLUMN created_at TYPE timestamp without time zone using created_at::timestamp;

ALTER TABLE public.wallets
ALTER COLUMN updated_at TYPE timestamp without time zone using updated_at::timestamp;
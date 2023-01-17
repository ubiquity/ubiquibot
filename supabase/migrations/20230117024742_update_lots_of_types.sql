ALTER TABLE public.users
ALTER COLUMN created_at TYPE text;

ALTER TABLE public.users
ALTER COLUMN updated_at TYPE text;

ALTER TABLE public.issues
ALTER COLUMN started_at TYPE text;

ALTER TABLE public.issues
ALTER COLUMN completed_at TYPE text;

ALTER TABLE public.issues
ALTER COLUMN closed_at TYPE text;

ALTER TABLE public.issues
ALTER COLUMN created_at TYPE text;

ALTER TABLE public.issues
ALTER COLUMN updated_at TYPE text;

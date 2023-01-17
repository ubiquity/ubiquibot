ALTER TABLE public.users
ALTER COLUMN public_repos TYPE integer USING (public_repos::integer);
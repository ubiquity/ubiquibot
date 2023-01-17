ALTER TABLE public.users
ALTER COLUMN followers TYPE integer USING (followers::integer);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS following integer;

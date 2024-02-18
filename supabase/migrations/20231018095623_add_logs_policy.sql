CREATE POLICY "Enable read access for all users" ON "public"."logs"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

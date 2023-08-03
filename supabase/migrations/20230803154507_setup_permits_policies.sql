ALTER TABLE permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for frontend" ON "public"."permits"
AS PERMISSIVE FOR SELECT
TO public
USING (true)
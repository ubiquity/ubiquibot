CREATE POLICY insert_policy
ON permits 
AS permissive
FOR insert
TO anon
WITH CHECK (true)
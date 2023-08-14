CREATE POLICY "Anon users can insert a new record" 
ON permits FOR insert
TO anon
USING (true)
WITH CHECK (true)
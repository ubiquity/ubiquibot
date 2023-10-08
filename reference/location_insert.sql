CREATE OR REPLACE FUNCTION handle_location_insert() RETURNS TRIGGER AS $$
DECLARE
    loc_id INTEGER;
BEGIN
    -- If the new values are null, return without doing anything
    IF NEW.node_id IS NULL OR NEW.node_type IS NULL OR NEW.node_url IS NULL THEN
        RETURN NEW;
    END IF;

    -- Check if the node_id, node_type, and node_url combination already exists in the locations table
    SELECT id INTO loc_id FROM public.locations WHERE node_id = NEW.node_id AND node_type = NEW.node_type AND node_url = NEW.node_url;

    -- If the combination doesn't exist, insert it and retrieve the new ID
    IF loc_id IS NULL THEN
        INSERT INTO public.locations (node_id, node_type, node_url) VALUES (NEW.node_id, NEW.node_type, NEW.node_url)
        RETURNING id INTO loc_id;
    ELSE
        -- If the combination exists, update it
        UPDATE public.locations SET node_id = NEW.node_id, node_type = NEW.node_type, node_url = NEW.node_url WHERE id = loc_id;
    END IF;

    -- If the trigger is BEFORE INSERT or BEFORE UPDATE, modify the NEW record directly
    NEW.node_id := NULL;
    NEW.node_type := NULL;
    NEW.node_url := NULL;
    NEW.location_id := loc_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
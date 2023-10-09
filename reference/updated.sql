-- update_updated_column

BEGIN
    NEW.updated = NOW();
    RETURN NEW;
END;

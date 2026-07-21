
DROP INDEX IF EXISTS water_entries_user_consumed_at_idx;

ALTER TABLE water_entries DROP CONSTRAINT water_entries_pkey;
ALTER TABLE water_entries DROP COLUMN id;

ALTER TABLE water_entries
    ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

CREATE INDEX water_entries_user_consumed_at_idx
    ON water_entries(user_id, consumed_at);

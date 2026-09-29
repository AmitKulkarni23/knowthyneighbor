ALTER TABLE couples ADD COLUMN city text;
ALTER TABLE couples ADD COLUMN state text;

CREATE INDEX idx_couples_city ON couples (city);
CREATE INDEX idx_couples_state ON couples (state);

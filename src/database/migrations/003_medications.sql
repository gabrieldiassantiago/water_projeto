CREATE TABLE medications (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency_per_day INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT medications_frequency_positive
        CHECK (frequency_per_day > 0),

    CONSTRAINT medications_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE medication_history (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    medication_id INTEGER NOT NULL,
    quantity_taken INTEGER NOT NULL DEFAULT 1,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT medication_history_quantity_positive
        CHECK (quantity_taken > 0),

    CONSTRAINT medication_history_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT medication_history_medication_fk
        FOREIGN KEY (medication_id)
        REFERENCES medications(id)
        ON DELETE CASCADE
);

CREATE INDEX medications_user_idx ON medications(user_id);
CREATE INDEX medication_history_user_taken_at_idx ON medication_history(user_id, taken_at DESC);

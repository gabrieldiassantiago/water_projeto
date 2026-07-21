CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hydration_goals (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    daily_amount_ml INTEGER NOT NULL,
    starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
    ends_at DATE,

    CONSTRAINT hydration_goals_daily_amount_positive
        CHECK (daily_amount_ml > 0),

    CONSTRAINT hydration_goals_valid_period
        CHECK (ends_at IS NULL OR ends_at >= starts_at),

    CONSTRAINT hydration_goals_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE water_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount_ml INTEGER NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT water_entries_amount_positive
        CHECK (amount_ml > 0),

    CONSTRAINT water_entries_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX water_entries_user_consumed_at_idx
    ON water_entries(user_id, consumed_at);

CREATE INDEX hydration_goals_user_starts_at_idx
    ON hydration_goals(user_id, starts_at DESC);
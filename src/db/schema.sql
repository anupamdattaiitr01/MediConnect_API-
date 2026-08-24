-- MediConnect schema. Run once against an empty database:
--   npm run db:setup

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role   AS ENUM ('patient', 'doctor');
CREATE TYPE slot_status AS ENUM ('available', 'booked');

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          user_role NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE slots (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time   TIMESTAMPTZ NOT NULL,
    status     slot_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_timeline CHECK (start_time < end_time)
);

CREATE TABLE bookings (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- UNIQUE is the second line of defence against double booking. Even if the
    -- application logic were wrong, the database physically cannot store two
    -- bookings for one slot.
    slot_id    UUID NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves the "list bookable slots" query: filters on status, orders by time.
CREATE INDEX idx_slots_available ON slots (start_time) WHERE status = 'available';
CREATE INDEX idx_slots_doctor    ON slots (doctor_id, start_time);
CREATE INDEX idx_bookings_patient ON bookings (patient_id);

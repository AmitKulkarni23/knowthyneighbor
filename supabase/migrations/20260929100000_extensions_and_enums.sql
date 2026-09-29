CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE hosting_preference AS ENUM ('host', 'visit', 'both');
CREATE TYPE meal_slot AS ENUM ('brunch', 'lunch', 'dinner');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined');

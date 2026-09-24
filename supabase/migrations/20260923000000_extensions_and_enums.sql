CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TYPE hosting_preference AS ENUM ('host', 'visit', 'both');
CREATE TYPE meal_slot AS ENUM ('brunch', 'lunch', 'dinner');
CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE meal_status AS ENUM ('proposed', 'confirmed', 'completed', 'cancelled');

-- Remove the message purge cron job (depended on meals table)
SELECT cron.unschedule('purge-old-messages');

-- Drop meals RLS policies
DROP POLICY IF EXISTS meals_select ON meals;
DROP POLICY IF EXISTS meals_insert ON meals;
DROP POLICY IF EXISTS meals_update ON meals;

-- Drop meals trigger and function
DROP TRIGGER IF EXISTS trg_update_meal_timestamp ON meals;
DROP FUNCTION IF EXISTS update_meal_timestamp();

-- Drop meals table
DROP TABLE IF EXISTS meals;

-- Drop meal_status enum (meal_slot kept — used by join_requests and availability)
DROP TYPE IF EXISTS meal_status;

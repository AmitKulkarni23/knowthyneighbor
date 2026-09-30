-- Postgres grants EXECUTE to PUBLIC on new functions by default. Our GRANTs to
-- authenticated add a privilege; they do not remove the default public one.
-- Revoke so only authenticated sessions can call these.

REVOKE EXECUTE ON FUNCTION get_conversations_for_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_join_requests_for_user() FROM PUBLIC, anon;

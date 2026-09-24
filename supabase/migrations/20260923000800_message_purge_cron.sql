SELECT cron.schedule(
  'purge-old-messages',
  '0 3 * * *',
  $$
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT m2.conversation_id
      FROM meals m2
      WHERE m2.status IN ('completed', 'cancelled')
        AND m2.updated_at < now() - INTERVAL '30 days'
    )
  $$
);

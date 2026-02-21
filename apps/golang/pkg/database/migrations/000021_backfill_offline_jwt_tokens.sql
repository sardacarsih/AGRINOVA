-- 000021_backfill_offline_jwt_tokens.sql
-- Idempotent backfill for legacy OFFLINE JWT rows.
-- Safe to run multiple times.

UPDATE jwt_tokens
SET
    offline_hash = COALESCE(NULLIF(offline_hash, ''), token_hash),
    expires_at = CASE
        WHEN expires_at IS NULL OR (created_at IS NOT NULL AND expires_at < created_at) THEN
            COALESCE(
                offline_expires_at,
                created_at + INTERVAL '30 days',
                NOW() + INTERVAL '30 days'
            )
        ELSE expires_at
    END,
    offline_expires_at = COALESCE(
        offline_expires_at,
        expires_at,
        created_at + INTERVAL '30 days',
        NOW() + INTERVAL '30 days'
    ),
    updated_at = NOW()
WHERE token_type = 'OFFLINE'
  AND (
        offline_hash IS NULL OR offline_hash = '' OR
        expires_at IS NULL OR
        (created_at IS NOT NULL AND expires_at < created_at) OR
        offline_expires_at IS NULL
  );


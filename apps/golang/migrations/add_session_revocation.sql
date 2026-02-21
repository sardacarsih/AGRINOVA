-- Add revocation fields to user_sessions table
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

-- Create index for revoked status for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked);

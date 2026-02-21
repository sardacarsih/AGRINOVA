-- Migration: Create user_device_tokens table for FCM push notifications
-- Created: 2024-12-09

CREATE TABLE IF NOT EXISTS user_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ANDROID', 'IOS')),
    device_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT idx_device_token_unique UNIQUE (token)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_device_token_user ON user_device_tokens(user_id);

-- Index for active token queries
CREATE INDEX IF NOT EXISTS idx_device_token_active ON user_device_tokens(user_id, is_active) 
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE user_device_tokens IS 'Stores FCM device tokens for push notifications';
COMMENT ON COLUMN user_device_tokens.token IS 'Firebase Cloud Messaging registration token';
COMMENT ON COLUMN user_device_tokens.platform IS 'Mobile platform: ANDROID or IOS';
COMMENT ON COLUMN user_device_tokens.device_id IS 'Unique device identifier from mobile app';

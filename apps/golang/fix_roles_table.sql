-- Fix for missing columns in roles table
-- Add is_system and deleted_at columns if they don't exist

DO $$
BEGIN
    -- Add is_system column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='is_system') THEN
        ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_system column to roles table';
    END IF;

    -- Add deleted_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='roles' AND column_name='deleted_at') THEN
        ALTER TABLE roles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added deleted_at column to roles table';
    END IF;

    -- Create index for deleted_at if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='roles' AND indexname='idx_roles_deleted_at') THEN
        CREATE INDEX idx_roles_deleted_at ON roles(deleted_at);
        RAISE NOTICE 'Created idx_roles_deleted_at index';
    END IF;
END $$;

-- Update existing roles to be system roles by default
UPDATE roles SET is_system = true WHERE is_system IS NULL;

-- Show the current roles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'roles'
ORDER BY ordinal_position;
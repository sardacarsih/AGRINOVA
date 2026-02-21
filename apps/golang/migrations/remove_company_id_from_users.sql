-- Migration: remove_company_id_from_users
-- Description: Removes the company_id column from users table as it is replaced by user_company_assignments

ALTER TABLE users DROP COLUMN IF EXISTS company_id;

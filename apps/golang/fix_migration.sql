-- Drop foreign key constraints temporarily to allow type changes
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS fk_companies_users CASCADE;
ALTER TABLE IF EXISTS estates DROP CONSTRAINT IF EXISTS fk_companies_estates CASCADE;
ALTER TABLE IF EXISTS divisions DROP CONSTRAINT IF EXISTS fk_estates_divisions CASCADE;
ALTER TABLE IF EXISTS blocks DROP CONSTRAINT IF EXISTS fk_divisions_blocks CASCADE;
ALTER TABLE IF EXISTS harvest_records DROP CONSTRAINT IF EXISTS fk_harvest_records_block CASCADE;
ALTER TABLE IF EXISTS harvest_records DROP CONSTRAINT IF EXISTS fk_harvest_records_mandor CASCADE;
ALTER TABLE IF EXISTS gate_check_records DROP CONSTRAINT IF EXISTS fk_gate_check_records_satpam CASCADE;
ALTER TABLE IF EXISTS user_estate_assignments DROP CONSTRAINT IF EXISTS fk_user_estate_assignments_user CASCADE;
ALTER TABLE IF EXISTS user_estate_assignments DROP CONSTRAINT IF EXISTS fk_user_estate_assignments_estate CASCADE;
ALTER TABLE IF EXISTS user_division_assignments DROP CONSTRAINT IF EXISTS fk_user_division_assignments_user CASCADE;
ALTER TABLE IF EXISTS user_division_assignments DROP CONSTRAINT IF EXISTS fk_user_division_assignments_division CASCADE;
ALTER TABLE IF EXISTS user_company_assignments DROP CONSTRAINT IF EXISTS fk_user_company_assignments_user CASCADE;
ALTER TABLE IF EXISTS user_company_assignments DROP CONSTRAINT IF EXISTS fk_user_company_assignments_company CASCADE;
ALTER TABLE IF EXISTS user_sessions DROP CONSTRAINT IF EXISTS fk_user_sessions_user CASCADE;
ALTER TABLE IF EXISTS device_bindings DROP CONSTRAINT IF EXISTS fk_device_bindings_user CASCADE;
ALTER TABLE IF EXISTS jwt_tokens DROP CONSTRAINT IF EXISTS fk_jwt_tokens_user CASCADE;
ALTER TABLE IF EXISTS security_events DROP CONSTRAINT IF EXISTS fk_security_events_user CASCADE;

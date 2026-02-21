-- Example seed for BKM company bridge mapping.
-- Run manually after migration 000046 if needed.
--
-- Use case:
-- - PT. KSK  : company_code = KSKINTI
-- - PT. BBL  : company_code = KSKBBL
--
-- Rules are evaluated by:
-- 1) longest iddata_prefix
-- 2) lowest priority value
-- 3) latest updated_at

-- Generic mapping by source iddata prefix.
INSERT INTO bkm_company_bridge (source_system, iddata_prefix, company_id, priority, notes)
SELECT 'BKM', 'KSKINTI', c.id, 10, 'Generic mapping for PT. KSK'
FROM companies c
WHERE UPPER(TRIM(COALESCE(c.company_code, ''))) = 'KSKINTI'
ON CONFLICT DO NOTHING;

INSERT INTO bkm_company_bridge (source_system, iddata_prefix, company_id, priority, notes)
SELECT 'BKM', 'KSKBBL', c.id, 10, 'Generic mapping for PT. BBL'
FROM companies c
WHERE UPPER(TRIM(COALESCE(c.company_code, ''))) = 'KSKBBL'
ON CONFLICT DO NOTHING;

-- Optional: if source prefix is same (example: KSK) but estate differs.
-- Uncomment and adjust estate_key as needed.
--
-- INSERT INTO bkm_company_bridge (source_system, iddata_prefix, estate_key, company_id, priority, notes)
-- SELECT 'BKM', 'KSK', 'ESTATE_INTI', c.id, 5, 'Specific estate route to PT. KSK'
-- FROM companies c
-- WHERE UPPER(TRIM(COALESCE(c.company_code, ''))) = 'KSKINTI';
--
-- INSERT INTO bkm_company_bridge (source_system, iddata_prefix, estate_key, company_id, priority, notes)
-- SELECT 'BKM', 'KSK', 'ESTATE_BBL', c.id, 5, 'Specific estate route to PT. BBL'
-- FROM companies c
-- WHERE UPPER(TRIM(COALESCE(c.company_code, ''))) = 'KSKBBL';

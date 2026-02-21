-- Migration: Update division names and codes
-- This fixes empty division name/code data

UPDATE divisions
SET nama = CASE id
    WHEN '78901234-f012-3456-7890-bcdef0123456' THEN 'Divisi A'
    WHEN '89012345-0123-4567-8901-cdef01234567' THEN 'Divisi B'
    WHEN '90123456-1234-5678-9012-def012345678' THEN 'Divisi C'
    WHEN '01234567-2345-6789-0123-ef0123456789' THEN 'Divisi D'
    WHEN '12345678-3456-7890-1234-f01234567890' THEN 'Divisi E'
    ELSE nama
END,
kode = CASE id
    WHEN '78901234-f012-3456-7890-bcdef0123456' THEN 'A'
    WHEN '89012345-0123-4567-8901-cdef01234567' THEN 'B'
    WHEN '90123456-1234-5678-9012-def012345678' THEN 'C'
    WHEN '01234567-2345-6789-0123-ef0123456789' THEN 'D'
    WHEN '12345678-3456-7890-1234-f01234567890' THEN 'E'
    ELSE kode
END
WHERE id IN (
    '78901234-f012-3456-7890-bcdef0123456',
    '89012345-0123-4567-8901-cdef01234567',
    '90123456-1234-5678-9012-def012345678',
    '01234567-2345-6789-0123-ef0123456789',
    '12345678-3456-7890-1234-f01234567890'
);

-- Also update estates with proper names
UPDATE estates
SET nama = CASE id
    WHEN '34567890-bcde-f012-3456-789abcdef012' THEN 'Estate Agrinova 1'
    WHEN '45678901-cdef-0123-4567-89abcdef0123' THEN 'Estate Agrinova 2'
    WHEN '56789012-def0-1234-5678-9abcdef01234' THEN 'Estate Nusantara 1'
    WHEN '67890123-ef01-2345-6789-abcdef012345' THEN 'Estate Riau 1'
    ELSE nama
END
WHERE id IN (
    '34567890-bcde-f012-3456-789abcdef012',
    '45678901-cdef-0123-4567-89abcdef0123',
    '56789012-def0-1234-5678-9abcdef01234',
    '67890123-ef01-2345-6789-abcdef012345'
);

-- Verify the updates
SELECT id, nama, kode, estate_id FROM divisions;
SELECT id, nama FROM estates;

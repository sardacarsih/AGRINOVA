-- Update manager_id for existing users in the database
-- This script establishes the manager hierarchy:
-- Mandor -> Asisten, Asisten -> Manager, Manager -> Area Manager, Satpam -> Manager

-- First, let's check current users
SELECT id, username, nama, role, manager_id FROM users ORDER BY role;

-- Update Mandor: manager is Asisten
UPDATE users 
SET manager_id = (SELECT id FROM users WHERE username = 'asisten' LIMIT 1)
WHERE username = 'mandor' AND (SELECT id FROM users WHERE username = 'asisten' LIMIT 1) IS NOT NULL;

-- Update Asisten: manager is Manager
UPDATE users 
SET manager_id = (SELECT id FROM users WHERE username = 'manager' LIMIT 1)
WHERE username = 'asisten' AND (SELECT id FROM users WHERE username = 'manager' LIMIT 1) IS NOT NULL;

-- Update Manager: manager is Area Manager
UPDATE users 
SET manager_id = (SELECT id FROM users WHERE username = 'areamanager' LIMIT 1)
WHERE username = 'manager' AND (SELECT id FROM users WHERE username = 'areamanager' LIMIT 1) IS NOT NULL;

-- Update Satpam: manager is Manager
UPDATE users 
SET manager_id = (SELECT id FROM users WHERE username = 'manager' LIMIT 1)
WHERE username = 'satpam' AND (SELECT id FROM users WHERE username = 'manager' LIMIT 1) IS NOT NULL;

-- Verify the updates
SELECT u.id, u.username, u.nama, u.role, u.manager_id, m.nama as manager_name
FROM users u
LEFT JOIN users m ON u.manager_id = m.id
ORDER BY u.role;

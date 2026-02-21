-- Up
ALTER TABLE users ADD COLUMN manager_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_manager FOREIGN KEY (manager_id) REFERENCES users(id);

-- Down
ALTER TABLE users DROP CONSTRAINT fk_users_manager;
ALTER TABLE users DROP COLUMN manager_id;

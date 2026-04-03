-- Speeds up the authorize() callback on login (the one legitimate auth DB hit)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

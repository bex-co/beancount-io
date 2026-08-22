-- Custom SQL migration file, put your code below! --
UPDATE users SET is_blocked = false WHERE is_blocked = true;
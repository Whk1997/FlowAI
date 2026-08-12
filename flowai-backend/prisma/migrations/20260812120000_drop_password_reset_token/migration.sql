-- Password reset tokens moved to Redis (or in-memory fallback)
DROP TABLE IF EXISTS "PasswordResetToken";

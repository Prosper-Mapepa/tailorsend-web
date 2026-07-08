-- Add admin role support for users
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';

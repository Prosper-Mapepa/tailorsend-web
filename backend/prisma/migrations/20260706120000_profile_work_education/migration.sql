-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "workExperience" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Profile" ADD COLUMN "education" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Profile" ADD COLUMN "certifications" TEXT NOT NULL DEFAULT '[]';

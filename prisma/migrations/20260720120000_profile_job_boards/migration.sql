-- Per-user career sites / ATS boards used by the job scanner
ALTER TABLE "Profile" ADD COLUMN "jobBoards" TEXT NOT NULL DEFAULT '[]';

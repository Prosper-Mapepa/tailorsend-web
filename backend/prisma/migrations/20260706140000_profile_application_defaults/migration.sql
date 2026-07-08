-- Application-default answers for autofill (EEO, work auth, sponsorship).

ALTER TABLE "Profile" ADD COLUMN "gender" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "raceEthnicity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "veteranStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "disabilityStatus" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "hearAboutSource" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "usState" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "authorizedToWork" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Profile" ADD COLUMN "sponsorshipDetails" TEXT NOT NULL DEFAULT '';

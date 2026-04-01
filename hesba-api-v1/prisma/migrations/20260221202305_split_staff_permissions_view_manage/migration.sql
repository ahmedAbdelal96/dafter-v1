-- AlterTable
ALTER TABLE "StaffPermission" ADD COLUMN     "viewLedger" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "viewParties" BOOLEAN NOT NULL DEFAULT false;

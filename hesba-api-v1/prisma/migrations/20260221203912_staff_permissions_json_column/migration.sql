/*
  Warnings:

  - You are about to drop the column `manageLedger` on the `StaffPermission` table. All the data in the column will be lost.
  - You are about to drop the column `manageParties` on the `StaffPermission` table. All the data in the column will be lost.
  - You are about to drop the column `manageUsers` on the `StaffPermission` table. All the data in the column will be lost.
  - You are about to drop the column `viewLedger` on the `StaffPermission` table. All the data in the column will be lost.
  - You are about to drop the column `viewParties` on the `StaffPermission` table. All the data in the column will be lost.
  - You are about to drop the column `viewReports` on the `StaffPermission` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StaffPermission" DROP COLUMN "manageLedger",
DROP COLUMN "manageParties",
DROP COLUMN "manageUsers",
DROP COLUMN "viewLedger",
DROP COLUMN "viewParties",
DROP COLUMN "viewReports",
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{}';

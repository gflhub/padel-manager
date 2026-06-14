/*
  Warnings:

  - Added the required column `createdBy` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Club` ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    ADD COLUMN `trialStartedAt` DATETIME(3) NULL,
    ADD COLUMN `trialWarningEmailSentAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Tournament` ADD COLUMN `createdBy` VARCHAR(36) NOT NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `entryFee` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `TournamentRegistration` ADD COLUMN `cancelledAt` DATETIME(3) NULL;

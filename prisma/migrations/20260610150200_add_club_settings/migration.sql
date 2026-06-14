-- CreateTable
CREATE TABLE `ClubSettings` (
    `id` VARCHAR(36) NOT NULL,
    `clubId` VARCHAR(36) NOT NULL,
    `complexName` VARCHAR(191) NULL,
    `complexAddress` VARCHAR(191) NULL,
    `complexPhone` VARCHAR(191) NULL,
    `complexEmail` VARCHAR(191) NULL,
    `maxAdvanceDays` INTEGER NOT NULL DEFAULT 30,
    `defaultSlotDuration` INTEGER NOT NULL DEFAULT 90,
    `allowPayLater` BOOLEAN NOT NULL DEFAULT true,
    `allowCredits` BOOLEAN NOT NULL DEFAULT true,
    `pixKey` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClubSettings_clubId_key`(`clubId`),
    INDEX `ClubSettings_clubId_idx`(`clubId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClubSettings` ADD CONSTRAINT `ClubSettings_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Payment` MODIFY `method` ENUM('CASH', 'CARD', 'TRANSFER', 'PIX', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `Reservation` ADD COLUMN `pricePerHour` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `clubId` VARCHAR(36) NOT NULL,
    `planName` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `dueDay` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `nextDueDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Subscription_clubId_idx`(`clubId`),
    INDEX `Subscription_userId_idx`(`userId`),
    INDEX `Subscription_status_idx`(`status`),
    INDEX `Subscription_nextDueDate_idx`(`nextDueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_clubId_fkey` FOREIGN KEY (`clubId`) REFERENCES `Club`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

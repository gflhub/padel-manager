-- DropForeignKey
ALTER TABLE `ComandaItem` DROP FOREIGN KEY `ComandaItem_productId_fkey`;

-- AlterTable
ALTER TABLE `ComandaItem` MODIFY `productId` VARCHAR(36) NULL;
ALTER TABLE `ComandaItem` ADD COLUMN `name` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ComandaItem` ADD CONSTRAINT `ComandaItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

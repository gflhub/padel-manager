-- AlterTable
ALTER TABLE `Reservation` ADD COLUMN `players` JSON NULL;
ALTER TABLE `Reservation` ADD COLUMN `totalPrice` DECIMAL(10, 2) NULL;

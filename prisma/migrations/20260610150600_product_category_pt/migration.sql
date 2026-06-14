-- Widen enum to allow both old and new values during migration
ALTER TABLE `Product` MODIFY `category` ENUM('FOOD', 'BEVERAGE', 'EQUIPMENT', 'OTHER', 'bebidas', 'lanches', 'doces', 'outros') NOT NULL;

-- Migrate existing data to new category values
UPDATE `Product` SET `category` = 'bebidas' WHERE `category` = 'BEVERAGE';
UPDATE `Product` SET `category` = 'lanches' WHERE `category` = 'FOOD';
UPDATE `Product` SET `category` = 'outros' WHERE `category` IN ('EQUIPMENT', 'OTHER');

-- Narrow enum to final values
ALTER TABLE `Product` MODIFY `category` ENUM('bebidas', 'lanches', 'doces', 'outros') NOT NULL;

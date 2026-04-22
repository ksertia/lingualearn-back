-- AlterTable
ALTER TABLE `subscription_plans` ADD COLUMN `reducePrice` DECIMAL(10, 2) NULL,
    ADD COLUMN `percentage` DECIMAL(5, 2) NULL;

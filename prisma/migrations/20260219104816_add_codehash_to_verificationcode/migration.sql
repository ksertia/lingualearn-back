/*
  Warnings:

  - You are about to drop the column `code` on the `verification_codes` table. All the data in the column will be lost.
  - Added the required column `codeHash` to the `verification_codes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `verification_codes` DROP COLUMN `code`,
    ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `codeHash` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX `verification_codes_type_idx` ON `verification_codes`(`type`);

-- RenameIndex
ALTER TABLE `verification_codes` RENAME INDEX `verification_codes_userId_fkey` TO `verification_codes_userId_idx`;

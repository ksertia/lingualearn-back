-- AlterTable: Path - renommer tempResaListime en estimatedMinutes
ALTER TABLE `paths` DROP COLUMN `tempResaListime`,
    ADD COLUMN `estimatedMinutes` INTEGER NULL;

-- AlterTable: Transaction - ajouter amount et currency
ALTER TABLE `transactions` ADD COLUMN `amount` DECIMAL(10, 2) NULL,
    ADD COLUMN `currency` VARCHAR(3) NOT NULL DEFAULT 'XOF';

-- AlterTable: UserStepProgress - supprimer progress redondant
ALTER TABLE `user_step_progress` DROP COLUMN `progress`;

-- CreateTable: PaymentRequest
CREATE TABLE `payment_requests` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `billingCycle` VARCHAR(20) NOT NULL DEFAULT 'monthly',
    `paymentMethod` VARCHAR(30) NOT NULL,
    `phoneNumber` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'XOF',
    `otpCode` VARCHAR(10) NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `otpVerified` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `failureReason` VARCHAR(255) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payment_requests_userId_status_idx`(`userId`, `status`),
    INDEX `payment_requests_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_requests` ADD CONSTRAINT `payment_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_requests` ADD CONSTRAINT `payment_requests_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

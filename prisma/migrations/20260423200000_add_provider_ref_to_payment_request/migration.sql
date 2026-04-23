-- AlterTable: PaymentRequest - ajouter providerRef (pay_token Orange / otpReference Moov)
ALTER TABLE `payment_requests` ADD COLUMN `providerRef` VARCHAR(255) NULL;

-- DropForeignKey
ALTER TABLE `emergencyassistance` DROP FOREIGN KEY `EmergencyAssistance_userId_fkey`;

-- DropForeignKey
ALTER TABLE `emergencyassistance` DROP FOREIGN KEY `EmergencyAssistance_vehicleId_fkey`;

-- DropForeignKey
ALTER TABLE `maintainancelog` DROP FOREIGN KEY `MaintainanceLog_userId_fkey`;

-- DropForeignKey
ALTER TABLE `maintainancelog` DROP FOREIGN KEY `MaintainanceLog_vehicleId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_productId_fkey`;

-- DropForeignKey
ALTER TABLE `order` DROP FOREIGN KEY `Order_userId_fkey`;

-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_userId_fkey`;

-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_vendorId_fkey`;

-- DropForeignKey
ALTER TABLE `productimage` DROP FOREIGN KEY `ProductImage_productId_fkey`;

-- DropForeignKey
ALTER TABLE `review` DROP FOREIGN KEY `Review_userId_fkey`;

-- DropForeignKey
ALTER TABLE `service` DROP FOREIGN KEY `Service_serviceProviderId_fkey`;

-- DropIndex
DROP INDEX `EmergencyAssistance_userId_fkey` ON `emergencyassistance`;

-- DropIndex
DROP INDEX `EmergencyAssistance_vehicleId_fkey` ON `emergencyassistance`;

-- DropIndex
DROP INDEX `MaintainanceLog_userId_fkey` ON `maintainancelog`;

-- DropIndex
DROP INDEX `MaintainanceLog_vehicleId_fkey` ON `maintainancelog`;

-- DropIndex
DROP INDEX `Order_productId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Order_userId_fkey` ON `order`;

-- DropIndex
DROP INDEX `Payment_userId_fkey` ON `payment`;

-- DropIndex
DROP INDEX `Product_vendorId_fkey` ON `product`;

-- DropIndex
DROP INDEX `ProductImage_productId_fkey` ON `productimage`;

-- DropIndex
DROP INDEX `Review_userId_fkey` ON `review`;

-- DropIndex
DROP INDEX `Service_serviceProviderId_fkey` ON `service`;

-- AddForeignKey
ALTER TABLE `MaintainanceLog` ADD CONSTRAINT `MaintainanceLog_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintainanceLog` ADD CONSTRAINT `MaintainanceLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_serviceProviderId_fkey` FOREIGN KEY (`serviceProviderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyAssistance` ADD CONSTRAINT `EmergencyAssistance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyAssistance` ADD CONSTRAINT `EmergencyAssistance_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `Vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

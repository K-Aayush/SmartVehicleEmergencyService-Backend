/*
  Warnings:

  - You are about to drop the column `VendorId` on the `product` table. All the data in the column will be lost.
  - Added the required column `vendorId` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `product` DROP FOREIGN KEY `Product_VendorId_fkey`;

-- DropIndex
DROP INDEX `Product_VendorId_fkey` ON `product`;

-- AlterTable
ALTER TABLE `product` DROP COLUMN `VendorId`,
    ADD COLUMN `vendorId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

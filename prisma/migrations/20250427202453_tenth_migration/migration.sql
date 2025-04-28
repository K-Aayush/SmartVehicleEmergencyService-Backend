/*
  Warnings:

  - Added the required column `banReason` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isBanned` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `banReason` VARCHAR(191) NOT NULL,
    ADD COLUMN `isBanned` BOOLEAN NOT NULL;

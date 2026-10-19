-- AlterTable
ALTER TABLE `IsOrtagi` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `IsOrtagi_userId_key` ON `IsOrtagi`(`userId`);

-- AddForeignKey
ALTER TABLE `IsOrtagi` ADD CONSTRAINT `IsOrtagi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

